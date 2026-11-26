/**
 * Estimation & BOQ Input Validator
 */

const validateEstimationInput = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.customerName !== undefined) {
    if (!data.customerName || typeof data.customerName !== "string" || !data.customerName.trim()) {
      errors.push("Customer Name is required for estimation.");
    }
  }

  if (!isUpdate || data.items !== undefined) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push("Estimation must contain at least one item or furniture assembly.");
    } else {
      data.items.forEach((item, index) => {
        if (!item.itemName || typeof item.itemName !== "string" || !item.itemName.trim()) {
          errors.push(`Item #${index + 1}: Item name is required.`);
        }
        if (item.quantity === undefined || Number(item.quantity) <= 0) {
          errors.push(`Item #${index + 1}: Quantity must be greater than 0.`);
        }
      });
    }
  }

  if (data.pricingMethod !== undefined) {
    const validMethods = ["markup", "margin"];
    if (!validMethods.includes(data.pricingMethod)) {
      errors.push("Pricing method must be either 'markup' or 'margin'.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateEstimationInput,
};
