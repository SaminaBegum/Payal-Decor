const accountModel = require("../models/accountModel");

const getAccounts = async (req, res) => {
  try {
    const accounts = await accountModel.getAllAccounts();
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    console.error("Get accounts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch accounts" });
  }
};

const createAccount = async (req, res) => {
  try {
    const { accountName, openingBalance } = req.body;

    if (!accountName || openingBalance === undefined || openingBalance === "") {
      return res.status(400).json({
        success: false,
        message: "Account name and opening balance are required",
      });
    }

    const account = await accountModel.createAccount(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error("Create account error:", error);
    res.status(500).json({ success: false, message: "Failed to create account" });
  }
};

const updateAccount = async (req, res) => {
  try {
    const account = await accountModel.updateAccount(req.params.id, req.body);

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    console.error("Update account error:", error);
    res.status(500).json({ success: false, message: "Failed to update account" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const deleted = await accountModel.deleteAccount(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};