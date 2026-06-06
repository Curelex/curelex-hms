import dotenv from 'dotenv';
dotenv.config();

const env = {
  nodeEnv:        process.env.NODE_ENV        || "production",
  port:           process.env.PORT            || 5000,
  mongoUri:       process.env.MONGO_URI       || "mongodb://admin:password@127.0.0.1:27017/curelex_dbms?authSource=admin",
  jwtSecret:      process.env.JWT_SECRET      || "clinic_secret_key_here",
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN  || "30d",
  ssoSecret:      process.env.SSO_SECRET      || "replace-with-sso-secret",
  defaultGstRate: Number(process.env.DEFAULT_GST_RATE || 18),
  invoicePrefix:  process.env.INVOICE_PREFIX  || "INV",
  invoiceDigits:  Number(process.env.INVOICE_DIGITS   || 4),
  clientUrl:      process.env.CLIENT_URL      || "https://curelex.in"
};

export default env;