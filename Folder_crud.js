import Queries from "./Queries";

class Folder_crud extends Queries {
  write = (data, options) => {
    let subfolder = new Array(),
      res;
    if (this.config.subfolder) {
      if (Array.isArray(this.config.subfolder))
        this.config.subfolder.map(
          (prop) => data[prop] && subfolder.push(data[prop])
        );
      else subfolder.push(data[prop]);

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

  remove = (remove_query, options) => {};

  remove_several = (remove_query, options) => {};
}

export default Folder_crud;
