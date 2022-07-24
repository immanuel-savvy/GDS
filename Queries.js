import {
  copy_object,
  get_timestamp_from_id,
  valid_id,
  _id,
} from "./utils/functions";

class Queries {
  write_to_ds = (data_, options) => {
    let filename,
      subfolder,
      no_joins,
      return_full,
      new_,
      exists,
      replace,
      data = copy_object(data_);

    if (options && typeof options === "object") {
      subfolder = options.subfolder;
      no_joins = options.no_joins;
      return_full = options.return_full;
    }

    let filepath = `${this.folder_path}/${subfolder || ""}`;

    if (!data._id) data._id = _id(this.folder_name);
    else exists = !!this.readone(data._id);

    if (!data.created) data.created = Date.now();
    if (!data.updated) data.updated = Date.now();

    let data_bfr_sweep = JSON.stringify(data);

    if (!exists || replace) {
      if (this.config.subfolder) {
        if (
          !this.config.recent_file ||
          this.config.recent_filesize >= this.config.max_filesize
        ) {
          filename = get_timestamp_from_id(data._id);

          this.config.recent_file = filename;
          this.config.recent_filesize = 0;
          new_ = true;
        } else filename = this.config.recent_file;
      } else {
        filename = data._id;
        new_ = true;
      }

      if (!no_joins) data = this.sweep_data(data);
      this.write_file(filename, data, { new_, subfolder });
    }

    let result = {
      _id: data._id,
      filename,
      exists,
      replace,
      filepath: filepath + filename,
      created: data.created,
      updated: data.updated,
    };
    if (return_full)
      result.insertion =
        data_bfr_sweep === JSON.stringify(data)
          ? data
          : this.readone(data._id, { subfolder: options && options.subfolder });

    return result;
  };

  readfile = (file_to_read) => {
    let file;
    try {
      file = this.fs.readFileSync(file_to_read, { encoding: "utf8" }) || null;
      if (file) {
        file = file.split("\n").filter((r) => r);

        for (let line = 0; line < file.length; line++) {
          try {
            file[line] = JSON.parse(file[line]);
          } catch (e) {
            throw new Error(`JSON Parse Error in readfile ::: ${file_to_read}`);
          }
        }
      } else file = new Array();
    } catch (e) {
      file = new Array();
    }

    return file;
  };

  array_comparison = (arr, comparison) => {
    let find = false;
    for (let a = 0; a < arr.length; a++) {
      if (arr[a] === comparison) {
        find = true;
        break;
      }
    }
    return find;
  };

  pass = (line, query, or = false) => {
    let pass = new Array();

    if (!query) return true;

    for (let q in query) {
      let qval = query[q],
        lval = line[q];

      if (Array.isArray(lval) || Array.isArray(qval)) {
        let arr1, arr2;
        if (!Array.isArray(lval)) {
          arr1 = new Array(lval);
          arr2 = qval;
        } else if (!Array.isArray(qval)) {
          arr1 = new Array(qval);
          arr2 = lval;
        } else (arr1 = qval), (arr2 = lval);

        let m = false;
        for (let l = 0; l < arr1.length; l++)
          if (this.array_comparison(arr2, arr1[l])) {
            m = true;
            break;
          }

        pass.push(m);
      } else if (typeof qval === "object") {
        if (Object(qval).hasOwnProperty("$ne")) pass.push(lval !== qval["$ne"]);
        else if (Object(qval).hasOwnProperty("$e"))
          pass.push(lval === qval["$e"]);
        else if (Object(qval).hasOwnProperty("$gt"))
          pass.push(lval > qval["$gt"]);
        else if (Object(qval).hasOwnProperty("$lt"))
          pass.push(lval < qval["$lt"]);
        else if (Object(qval).hasOwnProperty("$gte"))
          pass.push(lval >= qval["$gte"]);
        else if (Object(qval).hasOwnProperty("$lte"))
          pass.push(lval <= qval["$lte"]);
        else if (Object(qval).hasOwnProperty("$includes"))
          pass.push(lval.includes && lval.includes(qval["$lte"]));
      } else pass.push(lval === qval);
    }

    if (or) return !!pass.find((p) => p);
    else {
      for (let p = 0; p < pass.length; p++) if (!pass[p]) return false;
      return true;
    }
  };

  search_file = (query, file, or) => {
    let match = new Array();
    for (let line_number = 0; line_number < file.length; line_number++) {
      let line = file[line_number];
      if (this.pass(line, query, or)) match.push(line);
    }

    return match;
  };

  iterative_read = (lines) => {
    let folders_et_ids = new Object(),
      lines_ids = new Array();
    lines.map((line) => {
      for (let prop in line) {
        if (prop === "_id") {
          lines_ids.push(line[prop]);
          return;
        }

        let value = line[prop];
        if (typeof value === "string" && valid_id(value)) {
          let folder = value.split("~")[0];
          let ids = folders_et_ids[folder];
          if (ids) ids.push(value);
          else folders_et_ids[folder] = new Array(value);
        }
      }
    });

    let folders_count = 0;
    for (let folder in folders_et_ids) {
      let folders_ids = folders_et_ids[folder];
      folders_et_ids[folder] = this.ds
        .get_folder_by_id(folder)
        .read(folders_ids, {
          limit: folders_ids.length,
          subfolder: lines_ids,
        });
      folders_count++;
    }

    if (folders_count)
      lines = lines.map((line) => {
        for (let prop in line) {
          if (prop === "_id") continue;
          let value = line[prop];
          if (typeof value === "string" && valid_id(value))
            line[prop] =
              folders_et_ids[value.split("~")[0]].find(
                (file) => file && file._id === value
              ) || value;
        }
        return line;
      });

    return lines;
  };

  read_from_ds = (query, options) => {
    let limit,
      or,
      exclude,
      result = new Array();

    limit = (options && Number(options.limit)) || -1;
    or = options && Boolean(options.or);
    exclude = options && options.exclude;
    if (exclude && typeof exclude === "string") exclude = new Array(exclude);
    else if (!Array.isArray(exclude)) exclude = null;

    if (!this.config.subfolder && query && query._id) {
      if (!Array.isArray(query._id)) query._id = new Array(query._id);
      if (exclude)
        query._id = query._id.filter((_id) => !exclude.includes(_id));

      for (let i = 0; i < query._id.length; i++) {
        let __id = query._id[i];
        let file_to_read = `${this.folder_path}/${__id}`;
        result.push(...this.readfile(file_to_read));
      }
    } else {
      let subfolders =
        options && options.subfolder
          ? new Array(options.subfolder)
          : this.read_subfolders();

      for (let s = 0; s < subfolders.length; s++) {
        let subfolder = subfolders[s];
        let files = !this.config.subfolder
          ? new Array(subfolder)
          : this.read_subfolders(subfolder);

        if (!this.config.subfolder && exclude && exclude.includes(subfolder))
          continue;

        let should_break = false;
        for (let f = 0; f < files.length; f++) {
          if (limit === 0) break;

          let file = this.readfile(
            `${this.folder_path}/${subfolder}${
              this.config.subfolder ? `/${files[f]}` : ""
            }`
          );
          if (exclude && this.config.subfolder)
            file = file.filter((line) => !exclude.includes(line._id));

          let matches = this.search_file(query, file, or);
          result.push(...matches);

          if (limit !== -1) {
            if (result.length > limit) {
              result = result.slice(0, limit);
              should_break = true;
              break;
            } else if (result.length === limit) {
              should_break = true;
              break;
            }
          }
        }
        if (should_break) break;
      }
    }

    return this.iterative_read(result);
  };

  read_subfolders = (subfolder) =>
    this.fs
      .readdirSync(`${this.folder_path}${subfolder ? `/${subfolder}` : ""}`)
      .filter((file) => file !== ".config");

  write_file = (filename, data, options) => {
    let new_, subfolder;
    if (options) {
      new_ = options.new_;
      subfolder = options.subfolder;
    }
    let filepath = `${this.folder_path}/${
      this.config.subfolder ? `${subfolder}/` + filename : filename
    }`;
    data = JSON.stringify(data);

    let previous_size = 0;

    if (this.config.subfolder) {
      try {
        let bulk = this.fs.readFileSync(filepath, { encoding: "utf8" }) || "";
        if (bulk) previous_size = bulk.length;
        data = `${bulk}${bulk ? "\n" : ""}${data}`;
      } catch (e) {
        try {
          this.fs.mkdirSync(filepath.split("/").slice(0, -1).join("/"));
        } catch (e) {}
      }
    }

    this.fs.writeFileSync(filepath, data, {
      encoding: "utf8",
    });

    if (new_) this.config.total_files += 1;

    this.config.total_size += data.length - previous_size;
    this.config.total_entries += data
      .slice(previous_size ? previous_size + 1 : 0)
      .split("\n").length;

    this.config.updated = Date.now();
    this.persist_config();
  };

  remove_file = (filename, options) => {
    if (!options) options = {};
    let { subfolder, initial_size, initial_length } = options;

    this.fs.unlinkSync(
      `${this.folder_path}${subfolder ? `/${subfolder}` : ""}/${filename}`
    );

    this.config.total_size -= initial_size || 0;
    this.config.total_files -= 1;
    this.config.total_entries -= initial_length || 0;
    this.config.updated = Date.now();
    this.persist_config();
  };

  sweep_data = (data_object) => {
    for (let prop in data_object) {
      let val = data_object[prop];
      if (Array.isArray(val)) {
        data_object[prop] = val.map((v) => this.sweep_data(v));
      } else if (typeof val === "object" && val) {
        if (val._id) {
          let folder = this.ds.get_folder_by_id(val._id);
          if (folder) {
            let options_ = new Object(),
              subfolder = new Array();
            if (folder.config.subfolder) {
              folder.config.subfolder.map((sfolder) => {
                let v = val[sfolder];
                if (typeof v === "string") subfolder.push(v);
                else if (typeof v === "object" && valid_id(v._id))
                  subfolder.push(v._id);
              });
              subfolder = subfolder.filter((s) => s);
              !subfolder.length &&
                (subfolder.push(data_object._id),
                (val[folder.config.subfolder[0]] = data_object._id));

              options_.subfolder = subfolder;
            }
            folder.write(val, options_);
            data_object[prop] = val._id;
          }
        }
      }
    }
    return data_object;
  };

  remove_from_ds = (query, options, several) => {
    let limit,
      exclude,
      or,
      total_remove = 0,
      removed = new Array();

    limit = options.limit;
    or = options.or;
    if (exclude && typeof exclude === "string") exclude = new Array(exclude);

    if (!this.config.subfolder && query && query._id) {
      let filepath = `${this.folder_path}/${query._id}`;
      let file = this.readfile(filepath);
      this.remove_file(query._id, {
        initial_length: 1,
        initial_size: JSON.stringify(file).length,
      });
      return { removed: true };
    } else {
      let subfolders =
        options && options.subfolder
          ? new Array(options.subfolder)
          : this.read_subfolders();

      for (let s = 0; s < subfolders.length; s++) {
        let subfolder = subfolders[s];
        let files = !this.config.subfolder
          ? new Array(subfolder)
          : this.read_subfolders(subfolder);

        if (!this.config.subfolder && exclude && exclude.includes(subfolder))
          continue;

        let should_break = false;
        for (let f = 0; f < files.length; f++) {
          if (limit === 0) break;

          let file = this.readfile(
            `${this.folder_path}/${subfolder}${
              this.config.subfolder ? `/${files[f]}` : ""
            }`
          );
          if (exclude && this.config.subfolder)
            file = file.filter((line) => !exclude.includes(line._id));

          let match = this.search_file(query, file, or);
          if (!match.length) continue;

          let file_length = file.length;
          let filesize = JSON.stringify(file).length;

          if (!this.config.subfolder) {
            removed.push(file[0]);
            this.remove_file(subfolder, {
              initial_length: 1,
              initial_size: filesize,
            });
            file = new Array();
          } else {
            file = file
              .map((line) => {
                if (match.find((m) => m._id === line._id)) removed.push(line);
                else return line;
              })
              .filter((f) => f);
            file.length
              ? this.write_file(files[f], file, { subfolder })
              : this.remove_file(files[f], {
                  subfolder,
                  initial_length: file_length,
                  initial_size: filesize,
                });

            total_remove += file_length - file.length;
            if (limit !== -1 && total_remove >= limit) {
              removed = match;
              should_break = true;
              break;
            }
          }
        }
        if (should_break) break;
      }
    }
    return { removed: true, data: several ? removed : removed[0] };
  };
}

export default Queries;
