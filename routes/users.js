var express = require("express");
var router = express.Router();
let { validatedResult, CreateUserValidator, ModifyUserValidator } = require("../utils/validator")
let userModel = require("../schemas/users");
let userController = require("../controllers/users");
const { checkLogin,checkRole } = require("../utils/authHandler");
const excelJs = require('exceljs');
const path = require('path');
const crypto = require('crypto');
const { sendGeneratedPassword } = require('../utils/mailHandler');
const mongoose = require('mongoose');
const cartModel = require('../schemas/carts');


router.get("/", checkLogin,checkRole("ADMIN","MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
  res.send(users);
});

router.get("/import", async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, '../user.xlsx');
    const workbook = new excelJs.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const usersToImport = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { 
        let uCell = row.getCell(1).value;
        let eCell = row.getCell(2).value;

        let username = uCell && typeof uCell === 'object' ? (uCell.result !== undefined ? uCell.result : uCell.text) : uCell;
        let email = eCell && typeof eCell === 'object' ? (eCell.result !== undefined ? eCell.result : eCell.text) : eCell;

        usersToImport.push({
          username: username ? String(username).trim() : "",
          email: email ? String(email).trim() : ""
        });
      }
    });

    const results = {
      success: [],
      failed: []
    };

    const userRoleId = '69b2763ce64fe93ca6985b56';
    const batchSize = 50;

    for (let i = 0; i < usersToImport.length; i += batchSize) {
      const batch = usersToImport.slice(i, i + batchSize);
      
      for (const userData of batch) {
        const { username, email } = userData;

        if (!username || !email) {
          results.failed.push({ user: userData, reason: 'Thiếu username hoặc email.' });
          continue;
        }

        const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          results.failed.push({ user: userData, reason: 'Username hoặc email đã tồn tại.' });
          continue;
        }

        const randomPassword = crypto.randomBytes(8).toString('hex');

        try {
          const newUser = await userController.CreateAnUser(
            username, randomPassword, email, userRoleId
          );

          let newCart = new cartModel({ user: newUser._id });
          await newCart.save();

          await sendGeneratedPassword(email, username, randomPassword);
          results.success.push({ username, email });
          
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          results.failed.push({ user: userData, reason: error.message });
        }
      }

      if (i + batchSize < usersToImport.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    res.status(201).send(results);

  } catch (error) {
    res.status(500).send({ message: 'Lỗi xử lý file.', error: error.message });
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newUser = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email,
      req.body.role, req.body.fullname, req.body.avatarUrl
    )
    res.send(newUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;