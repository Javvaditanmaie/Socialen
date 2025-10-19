
module.exports = {
  create: async (Model, data) => {
    return Model.create(data);
  },

  findOne: async (Model, query = {}, projection = null, opts = {}) => {
    return Model.findOne(query, projection, opts);
  },

  findById: async (Model, id, projection = null, opts = {}) => {
    return Model.findById(id, projection, opts);
  },

  find: async (Model, query = {}, projection = null, opts = {}) => {
    return Model.find(query, projection, opts);
  },

  updateOne: async (Model, query, update, opts = {}) => {
    return Model.updateOne(query, update, opts);
  },

  findByIdAndUpdate: async (Model, id, update, opts = { new: true }) => {
    return Model.findByIdAndUpdate(id, update, opts);
  },

  deleteOne: async (Model, query) => {
    return Model.deleteOne(query);
  },

  deleteById: async (Model, id) => {
    return Model.findByIdAndDelete(id);
  },

  count: async (Model, query = {}) => {
    return Model.countDocuments(query);
  }
};
