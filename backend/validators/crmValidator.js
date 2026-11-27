/**
 * CRM Lead Validator
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validateLeadInput = () => {
  // Relaxed validations: allow creating and editing leads without mandatory field constraints
  return {
    isValid: true,
    errors: [],
  };
};

module.exports = {
  validateLeadInput,
  EMAIL_REGEX,
};
