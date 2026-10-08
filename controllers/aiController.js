const { generateDescription } = require('../services/geminiService');

exports.describe = async (req, res) => {
  const description = await generateDescription(req.body || {});
  res.json({ success: true, description });
};
