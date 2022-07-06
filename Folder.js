import Folder_crud from "./Folder_crud";
import { _id } from "./utils/functions";

class Folder extends Folder_crud {
  constructor(folder_name, ds, subfolder) {
    super();

    this.folder_name = folder_name;
    this.ds = ds;
    this.folder_path = `${this.ds.folders_path}/${folder_name}`;
    this.fs = this.ds._fs;
    this.subfolder =
      subfolder && typeof subfolder === "string"
        ? new Array(subfolder)
        : subfolder;
  }

  read_config = () => {
    if (this.config) return this.config;

    this.folder_config_path = `${this.folder_path}/.config`;
    try {
      this.config = this.fs.readFileSync(this.folder_config_path, {
        encoding: "utf8",
      });
    } catch (e) {
      return this.set_config();
    }

    if (this.config && typeof this.config === "string")
      this.config = JSON.parse(this.config);
    else this.set_config();
  };

  persist_config = () =>
    this.fs.writeFileSync(
      this.folder_config_path,
      JSON.stringify(this.config),
      {
        encoding: "utf8",
      }
    );

  set_config = () => {
    this.folder_config_path = `${this.folder_path}/.config`;
    let config = {
      folder_name: this.folder_name,
      folder_path: this.folder_path,
      ds: this.ds.ds_name,
      created: Date.now(),
      updated: Date.now(),
      max_filesize: 1048576,
      recent_file: null,
      recent_file_size: 0,
      total_files: 0,
      total_entries: 0,
      total_size: 0,
      subfolder: this.subfolder,
      structure: this.structure,
    };
    this.fs.writeFileSync(this.folder_config_path, JSON.stringify(config), {
      encoding: "utf8",
    });
    this.config = config;
  };

  create = () => {
    if (this.fs.existsSync(this.folder_path)) {
      this.read_config();
      return this;
    }

    this.fs.mkdirSync(this.folder_path);
    this.set_config();

    return this;
  };
}

export default Folder;
