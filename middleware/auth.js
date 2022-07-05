const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const smsClient = require('twilio')(process.env.TWOFAUTH_ACCOUNT, process.env.TWOFAUTH_TOKEN);

const extractToken = function (req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

const verifyToken = function (req, res, next) {
  const token = extractToken(req);
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    err ? res.status(401).json({result: err.name}) : next();
  });
}

const generateToken = async function (payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '60m'});
}

const sendVerificationSMS = async function (number) {
  let smsStatus = false;
  await smsClient.verify.services(process.env.TWOFAUTH_SERVICE)
  .verifications
  .create({to: number, channel: 'sms'})
  .then(verification => smsStatus = true)
  .catch(err => smsStatus = false);

  return smsStatus;
}

const checkVerificationStatus = function (number, code) {
  return new Promise((resolve, reject) => {
    smsClient.verify.services(process.env.TWOFAUTH_SERVICE)
    .verificationChecks
    .create({to: number, code: code})
    .then(verification_check => {
      resolve(verification_check.status === 'approved')
    })
    .catch(err => {
      resolve(false);
    });
  })


}

module.exports = {
  verifyToken,
  generateToken,
  sendVerificationSMS,
  checkVerificationStatus
}