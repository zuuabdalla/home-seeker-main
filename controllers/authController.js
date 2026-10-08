const User = require('../models/User');
const { safeRedirectPath } = require('../middleware/auth');
const { removeUploads, uploadedUrls } = require('../middleware/uploadMiddleware');
const { text, isEmail, isPhone } = require('../lib/validate');

const MIN_PASSWORD = 8;

function homeFor(user) {
  return user.role === 'admin' ? '/admin' : '/landlord';
}

function sessionUser(user) {
  return { id: user.id, name: user.full_name, email: user.email, role: user.role, avatar: user.profile_image };
}

// New session ID on login, so a session ID planted before login is useless afterwards.
function startSession(req, user) {
  const saved = req.session.saved;
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = sessionUser(user);
      req.session.saved = saved;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

exports.loginPage = (req, res) => {
  if (req.session.user) return res.redirect(homeFor(req.session.user));
  res.render('auth/login', { title: 'Log in', email: '', next: safeRedirectPath(req.query.next, '') });
};

exports.login = async (req, res) => {
  const email = text(req.body.email, 150).toLowerCase();
  const next = safeRedirectPath(req.body.next, '');
  const user = await User.findByEmailWithPassword(email);
  const passwordOk = await User.checkPassword(req.body.password, user?.password);

  if (!user || !passwordOk) {
    return res.status(401).render('auth/login', { title: 'Log in', email, next, errors: ['Incorrect email or password.'] });
  }
  if (!user.is_active) {
    return res.status(403).render('auth/login', {
      title: 'Log in', email, next, errors: ['This account has been suspended. Please contact support.'],
    });
  }

  await startSession(req, user);
  req.flash('success', `Welcome back, ${user.full_name.split(' ')[0]}!`);
  res.redirect(next || homeFor(user));
};

exports.registerPage = (req, res) => {
  if (req.session.user) return res.redirect(homeFor(req.session.user));
  res.render('auth/register', { title: 'Create an account', form: { role: 'landlord' } });
};

exports.register = async (req, res) => {
  const form = {
    full_name: text(req.body.full_name, 100),
    email: text(req.body.email, 150).toLowerCase(),
    phone: text(req.body.phone, 20),
    role: req.body.role === 'agent' ? 'agent' : 'landlord',
  };
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const errors = [];
  if (form.full_name.length < 2) errors.push('Enter your full name.');
  if (!isEmail(form.email)) errors.push('Enter a valid email address.');
  if (!isPhone(form.phone)) errors.push('Enter a valid Kenyan phone number, e.g. 0712 345 678.');
  if (password.length < MIN_PASSWORD) errors.push(`Use a password of at least ${MIN_PASSWORD} characters.`);
  if (password !== req.body.confirm_password) errors.push('The two passwords do not match.');
  if (!errors.length && (await User.emailOrPhoneTaken(form.email, form.phone))) {
    errors.push('An account with this email or phone number already exists.');
  }
  if (errors.length) {
    return res.status(400).render('auth/register', { title: 'Create an account', form, errors });
  }

  const user = await User.create({ ...form, password });
  await startSession(req, user);
  req.flash('success', 'Your account is ready. Add your first listing to get started!');
  res.redirect('/landlord');
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('hf.sid');
    res.redirect('/');
  });
};

exports.forgotPage = (req, res) => res.render('auth/forgot', { title: 'Reset your password' });

exports.profilePage = async (req, res) => {
  const profile = await User.findById(req.session.user.id);
  res.render('auth/profile', { title: 'My profile', profile });
};

exports.updateProfile = async (req, res) => {
  const userId = req.session.user.id;
  const avatarUrl = uploadedUrls(req)[0] || null;
  const fields = {
    full_name: text(req.body.full_name, 100),
    phone: text(req.body.phone, 20),
    bio: text(req.body.bio, 1000) || null,
  };

  const errors = [];
  if (fields.full_name.length < 2) errors.push('Enter your full name.');
  if (!isPhone(fields.phone)) errors.push('Enter a valid Kenyan phone number.');
  if (!errors.length && (await User.emailOrPhoneTaken('', fields.phone, userId))) {
    errors.push('That phone number is used by another account.');
  }
  if (errors.length) {
    if (avatarUrl) removeUploads([avatarUrl]);
    req.flash('error', errors.join(' '));
    return res.redirect('/profile');
  }

  const before = await User.findById(userId);
  const updated = await User.updateProfile(userId, { ...fields, profile_image: avatarUrl });
  if (avatarUrl && before.profile_image) removeUploads([before.profile_image]);

  req.session.user = sessionUser(updated);
  req.flash('success', 'Profile updated.');
  res.redirect('/profile');
};

exports.changePassword = async (req, res) => {
  const user = await User.findByEmailWithPassword(req.session.user.email);
  const { current_password, new_password, confirm_password } = req.body;

  let error = null;
  if (!(await User.checkPassword(current_password, user.password))) error = 'Your current password is incorrect.';
  else if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD) {
    error = `Use a new password of at least ${MIN_PASSWORD} characters.`;
  } else if (new_password !== confirm_password) error = 'The new passwords do not match.';

  if (error) {
    req.flash('error', error);
  } else {
    await User.setPassword(user.id, new_password);
    req.flash('success', 'Password changed.');
  }
  res.redirect('/profile#password');
};
