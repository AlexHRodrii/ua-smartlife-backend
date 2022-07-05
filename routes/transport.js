const express = require("express");
const router = express.Router();
const mysqlConf = require('../databaseConf.js').databasePool;
const moment = require("moment");

const filterHorario = (horarios) => {
  const nextHorarios = horarios.filter(horario => {
    let horaTable = moment(horario.HoraPaso, "HH:mm:ss")
    let horaActual = moment(new Date()).add(2, 'hours')
    return horaTable.diff(horaActual) > 0
  })
  nextHorarios.sort((a, b) => {
    return a.HoraPaso.localeCompare(b.HoraPaso);
  })

  return nextHorarios;
}

router.get('/nextTransport', function (req, res) {
  const tipo = req.query.tipoTransporte;
  const linea = req.query.linea;

  mysqlConf.getConnection(function (err, connection) {
    if (err) {
      console.log(err);
      res.status(500).json({
        result: 'Error en la conexión con la base de datos'
      });
    } else {
      connection.query(`SELECT *
                        FROM horariostransporte
                        WHERE Linea = '${linea}'
                          AND TipoTransporte = '${tipo}'`, function (err, rows) {
        if (err) {
          res.status(500).json({
            result: 'Error al hacer la petición en la base de datos'
          });
        } else {
          if (rows.length > 0) {
            const horarioFiltrado = filterHorario(rows);
            res.status(200).json({
              result: horarioFiltrado
            });
          } else {
            res.status(404).json({
              result: 'No hay transportes disponibles'
            });
          }
        }
      });

    }
  });
});
module.exports = router;