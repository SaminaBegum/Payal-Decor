/**
 * CRM Lead Validator
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validateLeadInput = (data, isUpdate = false) => {
  const errors = [];

  // 1. Business Name Validation
  if (!isUpdate || data.businessName !== undefined) {
    if (!data.businessName || typeof data.businessName !== "string" || !data.businessName.trim()) {
      errors.push("Business / Hostel Name is required.");
    }
  }

  // 2. Primary Phone Validation
  if (!isUpdate) {
    // When adding a new lead, formal phone number is strictly required
    if (!data.primaryPhone || typeof data.primaryPhone !== "string" || !data.primaryPhone.trim()) {
      errors.push("Formal primary phone number is required to add a lead.");
    } else {
      const cleanDigits = data.primaryPhone.replace(/[^0-9]/g, "");
      if (cleanDigits.length < 10 || cleanDigits.length > 15) {
        errors.push("Phone number must contain between 10 and 15 digits (e.g., 9881060565 or +91 98810 60565).");
      }
    }
  } else if (data.primaryPhone !== undefined && data.primaryPhone !== null && data.primaryPhone.trim() !== "") {
    // On update, only validate format if a value is provided
    const cleanDigits = data.primaryPhone.replace(/[^0-9]/g, "");
    if (cleanDigits.length < 10 || cleanDigits.length > 15) {
      errors.push("Phone number must contain between 10 and 15 digits.");
    }
  }

  // 3. Secondary Email Validation
  if (!isUpdate) {
    // When adding a new lead, formal email address is strictly required
    if (!data.secondaryEmail || typeof data.secondaryEmail !== "string" || !data.secondaryEmail.trim()) {
      errors.push("Formal email address is required to add a lead.");
    } else if (!EMAIL_REGEX.test(data.secondaryEmail.trim())) {
      errors.push("Please provide a valid formal email format (e.g., info@hostel.com).");
    }
  } else if (data.secondaryEmail !== undefined && data.secondaryEmail !== null && data.secondaryEmail.trim() !== "") {
    // On update, only validate format if a value is provided
    if (!EMAIL_REGEX.test(data.secondaryEmail.trim())) {
      errors.push("Please provide a valid formal email format (e.g., info@hostel.com).");
    }
  }

  // 4. Status Validation (optional normalize)
  if (data.status && typeof data.status === "string") {
    const validStatuses = ["New", "Contacted", "In Discussion", "Quotation Sent", "Closed", "Cold"];
    if (!validStatuses.includes(data.status)) {
      // allow flexible status
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateLeadInput,
  EMAIL_REGEX,
};
