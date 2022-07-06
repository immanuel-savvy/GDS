const charset =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const combinations = {
  alnum: charset,
  num: "01234556789",
  alpha: "abcdefghijklmnopqrstuvwxyz",
};

const gen_random_int = (max_int, min_int = 0) =>
  min_int + Math.floor(Math.random() * max_int);

const get_timestamp_from_id = (_id) => {
  let split_id = _id && _id.split("~");
  return split_id && split_id[2];
};

const generate_random_string = (len, combination) => {
  let string = "";
  combination = combinations[combination] || combinations["num"];
  for (let i = 0; i < len || 6; i++)
    string += combination[gen_random_int(combination.length)];

  return string;
};

const _id = (folder) => {
  let random_value = "";
  for (let i = 0; i < gen_random_int(32, 12); i++)
    random_value += charset[gen_random_int(charset.length)];

  return `${folder}~${random_value}~${Date.now()}`;
};

const valid_id = (val) => {
  if (typeof val !== "string") return;
  let splited = val.split("~");
  if (splited.length !== 3) return;

  return true;
};

const copy_object = (object) => {
  let new_object = { ...object };
  for (let prop in new_object) {
    let val = new_object[prop];
    if (Array.isArray(val)) new_object[val] = val.map((v) => copy_object(v));
    else if (typeof val === "object" && val) new_object[val] = copy_object(val);
  }

  return new_object;
};

export {
  _id,
  gen_random_int,
  get_timestamp_from_id,
  copy_object,
  valid_id,
  generate_random_string,
};
