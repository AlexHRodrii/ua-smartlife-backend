const express = require("express");
const moment = require("moment");
const router = express.Router();
const middlewareAuth = require('../middleware/auth');
const mysqlConf = require('../databaseConf.js').databasePool;


router.get('/', function (req, res) {

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM foros`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            res.status(200).json({
              result: rows
            });
          } else {
            res.status(404).json({
              result: 'No hay foros disponibles'
            });
          }
        }
      });

    }
  });
});

router.get('/:forumID/messages', function (req, res) {

  const forumID = req.params.forumID

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM mensajesforo
                        WHERE ForoID = ${forumID}`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            res.status(200).json({
              result: rows
            });
          } else {
            res.status(404).json({
              result: 'No hay mensajes a mostrar'
            });
          }
        }
      });

    }
  });
});

router.post('/:forumID/messages', middlewareAuth.verifyToken, function (req, res) {

  const forumID = req.params.forumID
  const {textoMensaje, remitenteID} = req.body;
  const actualDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`INSERT INTO mensajesforo (TextoMensaje, FechaHora, RemitenteID, ForoID)
                        VALUES ('${textoMensaje}', '${actualDate}', ${remitenteID}, ${forumID})`, function (err, rows) {
        if (err) {
          console.log(err);
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          res.status(201).json({
            result: 'Mensaje creado correctamente'
          });

        }
      });

    }
  });
});
module.exports = router;