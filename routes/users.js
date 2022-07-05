const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();
const mysqlConf = require('../databaseConf.js').databasePool;
const bcrypt = require('bcrypt');
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const dotenv = require('dotenv');
const middlewares = require('../middleware/auth');

dotenv.config();
sharp.cache(false);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/users')
  },
  filename: function (req, file, cb) {
    cb(null, req.body.Email + path.extname(file.originalname))
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

/* GET user by id */
router.get('/:userID', middlewares.verifyToken, function (req, res, next) {
  let userID = req.params.userID;

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM usuarios
                        WHERE id = ${userID}`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            rows[0].FechaNacimiento = moment(rows[0].FechaNacimiento).format('YYYY-MM-DD');
            res.status(200).json({
              result: rows[0]
            });
          } else {
            res.status(404).json({
              result: 'No se ha encontrado el usuario indicado'
            });
          }
        }
      });
    }
  });
});

// Check name availability
router.get('/checkAvailability/:email', function (req, res, next) {
  let email = req.params.email;
  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM usuarios
                        WHERE Email = '${email}'`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        }
        rows.length > 0 ? res.status(200).json({result: false}) : res.status(200).json({result: true});
      });
    }
  });
});

/* POST a new user */
router.post('/register', upload.single('ProfilePic'), async function (req, res, next) {
  let userData = req.body;
  let hashedPassword = '';
  let profilePicPath = '';

  await bcrypt.hash(userData.Password, 10).then((hash) => {
    hashedPassword = hash;
  })
  .catch((err) => {
    res.status(500).json({
      result: 'Error al encriptar la contraseña'
    });
  });

  if (req.file) {
    sharp(`public/images/users/${req.file.filename}`).resize(200, 200)
    .toBuffer(function (err, buffer) {
      fs.writeFile(`public/images/users/${req.file.filename}`, buffer, function (err) {
        if (err) {
          res.status(500).json({
            result: 'Error en el tratamiento de la imagen de perfil'
          });
        }
      });
    });
    profilePicPath = req.file.filename;
  }

  mysqlConf.getConnection(function (err, connection) {
      if (err) {
        res.status(500).json({
          result: 'Error en la conexión con la base de datos'
        });
      } else {
        connection.query(`INSERT INTO usuarios (Nombre, Email, PhoneNumber, ProfilePicPath, HashedPassword,
                                                FechaNacimiento, EstudiosActuales, UserType)
                          VALUES ('${userData.Nombre}', '${userData.Email}',
                                  '${userData.PhoneNumber}',
                                  '${profilePicPath}', '${hashedPassword}', '${userData.FechaNacimiento}',
                                  '${userData.EstudiosActuales}', 'CLIENT')`,
          function (err, rows) {
            if (err) {
              res.status(500).json({
                result: 'Error al hacer la petición en la base de datos'
              });
            } else {
              res.status(201).json({
                result: 'Usuario registrado correctamente'
              });
            }
          });
      }
    }
  );
});

router.post('/login', function (req, res, next) {
  let userData = req.body;

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM usuarios
                        WHERE Email = '${userData.Email}'`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            bcrypt.compare(userData.Password, rows[0].HashedPassword, async function (err, result) {
              if (err) {
                res.status(500).json({
                  result: 'Error al comparar las contraseñas'
                });
              }
              if (result) {
                let token = await middlewares.generateToken({userid: rows[0].id})
                res.status(200).json({
                  result: 'Usuario autenticado correctamente',
                  token: token
                });
              } else {
                res.status(401).json({
                  result: 'La contraseña introducida no es correcta'
                });
              }
            });
          } else {
            res.status(401).json({
              result: 'El usuario introducido no existe'
            });
          }
        }
      });
    }

  });
});

router.post('/sendTwoFactorCode/:userid', function (req, res) {
  // Read user phone from database
  let userID = req.params.userid;
  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT PhoneNumber
                        FROM usuarios
                        WHERE id = ${userID}`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            let phoneNumber = rows[0].PhoneNumber;
            const smsSended = middlewares.sendVerificationSMS(phoneNumber);

            smsSended ? res.status(200).json({result: 'Mensaje de verificación enviado'}) : res.status(500).json({result: 'Error al enviar el mensaje de verificación'});

          } else {
            res.status(404).json({
              result: 'No se ha encontrado el usuario indicado'
            });
          }
        }
      });
    }
  });
})

router.post('/verifyTwoFactorCode/:userid', function (req, res) {
  // Read user phone from database
  let userID = req.params.userid;
  let code = req.body.code;

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT PhoneNumber
                        FROM usuarios
                        WHERE id = ${userID}`, async function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            let phoneNumber = rows[0].PhoneNumber;
            const result = await middlewares.checkVerificationStatus(phoneNumber, code);
            result === true ? res.status(200).json({result: 'Verificación correcta'}) : res.status(500).json({result: 'Error al verificar el código introducido'});

          } else {
            res.status(404).json({
              result: 'No se ha encontrado el usuario indicado'
            });
          }
        }
      });
    }
  });
})

module.exports = router;
