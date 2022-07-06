import fs from "fs";
import Folder from "./Folder";
import GDSFile from "./GDSFile";

class GDS extends GDSFile {
  constructor(ds_name, key) {
    super();

    this.ds_name = ds_name;
    this._path = `${process.env["HOME"]}/Develop/.GDS`;
    this.ds_config_path = this._path + "/.config";
    this.folders_path = `${this._path}/folders`;
    this.files_path = `${this._path}/files`;
    this.folders = new Array();
    this.ds_config = new Object();
    this._fs = fs;
  }

  create_config = () => {
    return {
      datastore_name: this.ds_name,
      folders: 0,
      files: 0,
      created: Date.now(),
      updated: Date.now(),
    };
  };

  sync = async () => {
    if (!this._fs.existsSync(this.folders_path))
      this._fs.mkdirSync(this.folders_path, { recursive: true });
    if (!this._fs.existsSync(this.files_path))
      this._fs.mkdirSync(this.files_path);

    if (!this._fs.existsSync(this.ds_config_path)) {
      this.config = this.create_config();
      this._fs.writeFileSync(this.ds_config_path, JSON.stringify(this.config), {
        encoding: "utf8",
      });
    } else
      this.config = JSON.parse(
        this._fs.readFileSync(this.ds_config_path, { encoding: "utf8" })
      );

    this.synced = true;
  };

  folder = (folder_name, subfolder) => {
    if (!this.synced) throw new Error("Sync GDS first!");

    let folder = new Folder(folder_name, this, subfolder).create();

    this.folders.push(folder);

    return folder;
  };

  get_folder_by_id = (folder_name) =>
    this.folders.find((folder) => folder.folder_name === folder_name);
}

export default GDS;
