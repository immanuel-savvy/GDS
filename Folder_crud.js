import Queries from "./Queries";
import { copy_object } from "./utils/functions";

class Folder_crud extends Queries {
  write = (data, options) => {
    let subfolder = new Array(),
      res;
    if (this.config.subfolder) {
      this.config.subfolder.map(
        (prop) => data[prop] && subfolder.push(data[prop])
      );

      for (let s = 0; s < subfolder.length; s++)
        res = this.write_to_ds(data, { subfolder: subfolder[s] });
    } else res = this.write_to_ds(data, options);

    return res;
  };

  read = (query, options) => {
    let result = new Array();
    if (
      Array.isArray(query) &&
      !query
        .map((q) => typeof q === "object" && !Array.isArray(q))
        .filter((p) => !p).length
    ) {
      for (let r = 0; r < query.length; r++)
        result.push(
          ...this.read(query[r], {
            ...options,
            exclude: result.map((r) => r._id),
          })
        );
      return result;
    }

    if (typeof query === "string" || Array.isArray(query))
      query = { _id: query };

    if (options && options.subfolder) {
      let subfolder = options.subfolder;
      if (!Array.isArray(subfolder)) subfolder = new Array(subfolder);

      for (let s = 0; s < subfolder.length; s++)
        result.push(
          ...this.read_from_ds(query, { ...options, subfolder: subfolder[s] })
        );
    } else result.push(...this.read_from_ds(query, options));

    return result;
  };

  readone = (query, options) => {
    let result = this.read(query, { ...options, limit: 1 });
    return result[0];
  };

  write_several = (data_array, options) => {
    let result = new Array();
    if (!Array.isArray(data_array)) {
      console.warn("Use Data Array instead; substituting .write for you.");
      return this.write(data_array, { ...options });
    } else
      for (let d = 0; d < data_array.length; d++)
        result.push(this.write(data_array[d], { ...options }));

    return result;
  };

  update = (query, update_query, options) => {};

  update_several = (query, update_query, options) => {};

  replace = (replace_query, replacement, options) => {
    let remove_res = this.remove_several(replace_query, copy_object(options));
    let write_res = this.write(replacement, { ...options, return_full: true });

    let ret = {
      ...write_res,
      replaced: true,
      removed: remove_res.data.map((r) => r._id),
      replacement: copy_object(write_res.insertion),
    };
    delete ret.insertion;
    console.log(ret, "return here");
    return ret;
  };

  remove = (remove_query, options, no_limit) => {
    if (!options) options = new Object();
    if (typeof remove_query === "string") remove_query = { _id: remove_query };
    options.limit = no_limit ? -1 : 1;
    if (options.subfolder) {
      let result = new Array();
      if (!Array.isArray(options.subfolder))
        options.subfolder = new Array(options.subfolder);
      for (let o = 0; o < options.subfolder.length; o++) {
        let subfolder = options.subfolder[o];
        result.push(
          this.remove_from_ds(remove_query, { ...options, subfolder })
        );
      }
      return result;
    }

    return this.remove_from_ds(remove_query, options, no_limit);
  };

  remove_several = (remove_query, options) => {
    return this.remove(remove_query, options, true);
  };
}

export default Folder_crud;
