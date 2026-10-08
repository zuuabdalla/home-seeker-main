const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { tokensMatch } = require('./security');

const PUBLIC_DIR = path.join(__dirname, '../public');
const PROPERTY_DIR = path.join(PUBLIC_DIR, 'uploads/properties');
const PROFILE_DIR = path.join(PUBLIC_DIR, 'uploads/profiles');
fs.mkdirSync(PROPERTY_DIR, { recursive: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function storageIn(dir) {
  return multer.diskStorage({
    destination: dir,
    // Random names: never reuse the uploader's filename or extension.
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  });
}

function fileFilter(req, file, cb) {
  if (ALLOWED[file.mimetype]) return cb(null, true);
  const err = new Error('Only JPG, PNG and WEBP images are allowed.');
  err.code = 'BAD_FILE_TYPE';
  return cb(err);
}

const propertyUpload = multer({
  storage: storageIn(PROPERTY_DIR),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter,
});

const avatarUpload = multer({
  storage: storageIn(PROFILE_DIR),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter,
});

const UPLOAD_ERRORS = {
  BAD_FILE_TYPE: 'Only JPG, PNG and WEBP images are allowed.',
  LIMIT_FILE_SIZE: 'That image is too large. Photos must be under 5 MB (profile pictures under 3 MB).',
  LIMIT_FILE_COUNT: 'You can upload up to 10 images at a time.',
};

// Runs multer, then checks the CSRF token (multipart bodies are only readable
// after multer has parsed them). Upload errors become a flash message.
function handleUpload(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      const back = req.get('referer') || '/landlord/properties';
      if (err) {
        req.flash('error', UPLOAD_ERRORS[err.code] || 'The upload failed. Please try again.');
        return res.redirect(back);
      }
      if (!tokensMatch(req.body && req.body._csrf, req.session.csrfToken)) {
        removeUploads(uploadedUrls(req));
        req.flash('error', 'Your form expired. Please try again.');
        return res.redirect(back);
      }
      return next();
    });
  };
}

function uploadedUrls(req) {
  const files = req.files || (req.file ? [req.file] : []);
  return files.map((f) => '/' + path.relative(PUBLIC_DIR, f.path).split(path.sep).join('/'));
}

// Deletes local uploads. Ignores remote URLs (e.g. seed images) and missing files.
function removeUploads(urls = []) {
  for (const url of urls) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) continue;
    const filePath = path.join(PUBLIC_DIR, url);
    if (!filePath.startsWith(path.join(PUBLIC_DIR, 'uploads'))) continue;
    fs.promises.unlink(filePath).catch(() => {});
  }
}

module.exports = {
  propertyImages: handleUpload(propertyUpload.array('images', 10)),
  avatar: handleUpload(avatarUpload.single('profile_image')),
  uploadedUrls,
  removeUploads,
};
