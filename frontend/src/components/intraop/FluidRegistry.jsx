// src/components/intraop/FluidRegistry.jsx
'use client';

import { useState, useEffect } from 'react';
import { fluidsApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

/**
 * FluidRegistry - Componente para registro de fluidos y hemoderivados
 */
export default function FluidRegistry({ caseId, phase }) {
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formulario de registro
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    // Cristaloides
    plasmalyte: 0,
    ringer: 0,
    saline: 0,
    dextrose: 0,
    // Coloides
    colloids: 0,
    albumin: 0,
    // Hemoderivados
    redBloodCells: 0,
    plasma: 0,
    platelets: 0,
    cryoprecip: 0,
    cellSaver: 0,
    fibrinogen: 0,
    pcc: 0,
    factorVII: 0,
    otherFluids: '',
    // Pérdidas
    insensibleLoss: 0,
    ascites: 0,
    suction: 0,
    gauze: 0,
    urine: 0,
  });

  // Cargar registros y totales
  useEffect(() => {
    if (caseId && phase) {
      fetchData();
    }
  }, [caseId, phase]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsResponse, totalsResponse] = await Promise.allSettled([
        fluidsApi.list({ caseId, phase }),
        fluidsApi.getTotals(caseId, phase),
      ]);

      if (recordsResponse.status === 'fulfilled') {
        setRecords(recordsResponse.value.data || []);
      }

      if (totalsResponse.status === 'fulfilled') {
        setTotals(totalsResponse.value);
      }
    } catch (error) {
      console.error('Error al cargar datos de fluidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'otherFluids' || name === 'timestamp' ? value : parseInt(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fluidsApi.create({
        caseId,
        phase,
        ...formData,
        timestamp: new Date(formData.timestamp).toISOString(),
      });

      // Resetear formulario
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        plasmalyte: 0,
        ringer: 0,
        saline: 0,
        dextrose: 0,
        colloids: 0,
        albumin: 0,
        redBloodCells: 0,
        plasma: 0,
        platelets: 0,
        cryoprecip: 0,
        cellSaver: 0,
        fibrinogen: 0,
        pcc: 0,
        factorVII: 0,
        otherFluids: '',
        insensibleLoss: 0,
        ascites: 0,
        suction: 0,
        gauze: 0,
        urine: 0,
      });

      setShowForm(false);
      await fetchData();
    } catch (error) {
      alert('Error al registrar fluidos: ' + error.message);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm('¿Eliminar este registro de fluidos?')) {
      try {
        await fluidsApi.delete(id);
        await fetchData();
      } catch (error) {
        alert('Error al eliminar registro: ' + error.message);
      }
    }
  };

  // Calcular totales de reposición
  const calculateTotalInput = () => {
    if (!totals) return 0;
    const crystalloids = totals.plasmalyte + totals.ringer + totals.saline + totals.dextrose;
    const colloids = totals.colloids + totals.albumin;
    const bloodProducts =
      totals.redBloodCells * 250 +
      totals.plasma * 250 +
      totals.platelets * 250 +
      totals.cryoprecip +
      totals.cellSaver +
      totals.fibrinogen * 50 +
      totals.pcc * 20 +
      totals.factorVII * 2;
    return crystalloids + colloids + bloodProducts;
  };

  // Calcular totales de pérdidas
  const calculateTotalLoss = () => {
    if (!totals) return 0;
    return totals.insensibleLoss + totals.ascites + totals.suction + totals.gauze + totals.urine;
  };

  return (
    <Card className="bg-dark-800">
      <CardHeader className="border-b border-dark-400">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Fluidos y Hemoderivados</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              {records.length} registro{records.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Agregar Fluidos'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Resumen de totales */}
        {totals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-dark-700 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{calculateTotalInput()} ml</div>
              <div className="text-xs text-gray-400 mt-1">Reposición Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{calculateTotalLoss()} ml</div>
              <div className="text-xs text-gray-400 mt-1">Pérdidas Totales</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                {totals.balance > 0 && '+'}{totals.balance} ml
              </div>
              <div className="text-xs text-gray-400 mt-1">Balance Neto</div>
            </div>
          </div>
        )}

        {/* Formulario de registro */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-6 mb-6 p-4 bg-dark-700 rounded-lg">
            {/* Timestamp */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hora de registro</label>
              <input
                type="datetime-local"
                name="timestamp"
                value={formData.timestamp}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-surgical-500"
                required
              />
            </div>

            {/* Cristaloides */}
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-3">Cristaloides (ml)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FluidInput label="Plasmalyte" name="plasmalyte" value={formData.plasmalyte} onChange={handleInputChange} />
                <FluidInput label="Ringer" name="ringer" value={formData.ringer} onChange={handleInputChange} />
                <FluidInput label="Salino" name="saline" value={formData.saline} onChange={handleInputChange} />
                <FluidInput label="Dextrosa" name="dextrose" value={formData.dextrose} onChange={handleInputChange} />
              </div>
            </div>

            {/* Coloides */}
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-3">Coloides (ml)</h4>
              <div className="grid grid-cols-2 gap-3">
                <FluidInput label="Coloides" name="colloids" value={formData.colloids} onChange={handleInputChange} />
                <FluidInput label="Albúmina" name="albumin" value={formData.albumin} onChange={handleInputChange} />
              </div>
            </div>

            {/* Hemoderivados */}
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-3">Hemoderivados</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FluidInput label="GR (unidades)" name="redBloodCells" value={formData.redBloodCells} onChange={handleInputChange} />
                <FluidInput label="Plasma (unidades)" name="plasma" value={formData.plasma} onChange={handleInputChange} />
                <FluidInput label="Plaquetas (unidades)" name="platelets" value={formData.platelets} onChange={handleInputChange} />
                <FluidInput label="Crioprecipitados (ml)" name="cryoprecip" value={formData.cryoprecip} onChange={handleInputChange} />
                <FluidInput label="Cell Saver (ml)" name="cellSaver" value={formData.cellSaver} onChange={handleInputChange} />
                <FluidInput label="Fibrinógeno (gramos)" name="fibrinogen" value={formData.fibrinogen} onChange={handleInputChange} />
                <FluidInput label="CCP (unidades)" name="pcc" value={formData.pcc} onChange={handleInputChange} />
                <FluidInput label="Factor VII (mg)" name="factorVII" value={formData.factorVII} onChange={handleInputChange} />
              </div>
            </div>

            {/* Pérdidas */}
            <div>
              <h4 className="text-sm font-semibold text-orange-400 mb-3">Pérdidas (ml)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FluidInput label="Pérdida insensible" name="insensibleLoss" value={formData.insensibleLoss} onChange={handleInputChange} />
                <FluidInput label="Ascitis" name="ascites" value={formData.ascites} onChange={handleInputChange} />
                <FluidInput label="Aspirador" name="suction" value={formData.suction} onChange={handleInputChange} />
                <FluidInput label="Gasas" name="gauze" value={formData.gauze} onChange={handleInputChange} />
                <FluidInput label="Diuresis" name="urine" value={formData.urine} onChange={handleInputChange} />
              </div>
            </div>

            {/* Otros fluidos */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Otros fluidos (notas)</label>
              <textarea
                name="otherFluids"
                value={formData.otherFluids}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg focus:ring-2 focus:ring-surgical-500"
                rows={2}
                placeholder="Ej: Solución de bicarbonato 100ml, etc."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Guardar Registro
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {/* Lista de registros */}
        {loading ? (
          <div className="py-8 text-center">
            <Spinner size="md" />
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="p-4 bg-dark-700 rounded-lg border border-dark-400">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-300">
                    {new Date(record.timestamp).toLocaleString('es-UY')}
                  </div>
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Cristaloides */}
                  {record.plasmalyte > 0 && <RecordItem label="Plasmalyte" value={record.plasmalyte} unit="ml" color="blue" />}
                  {record.ringer > 0 && <RecordItem label="Ringer" value={record.ringer} unit="ml" color="blue" />}
                  {record.saline > 0 && <RecordItem label="Salino" value={record.saline} unit="ml" color="blue" />}
                  {record.dextrose > 0 && <RecordItem label="Dextrosa" value={record.dextrose} unit="ml" color="blue" />}

                  {/* Coloides */}
                  {record.colloids > 0 && <RecordItem label="Coloides" value={record.colloids} unit="ml" color="blue" />}
                  {record.albumin > 0 && <RecordItem label="Albúmina" value={record.albumin} unit="ml" color="blue" />}

                  {/* Hemoderivados */}
                  {record.redBloodCells > 0 && <RecordItem label="GR" value={record.redBloodCells} unit="U" color="red" />}
                  {record.plasma > 0 && <RecordItem label="Plasma" value={record.plasma} unit="U" color="red" />}
                  {record.platelets > 0 && <RecordItem label="Plaquetas" value={record.platelets} unit="U" color="red" />}
                  {record.cryoprecip > 0 && <RecordItem label="Crioprecipitados" value={record.cryoprecip} unit="ml" color="red" />}
                  {record.cellSaver > 0 && <RecordItem label="Cell Saver" value={record.cellSaver} unit="ml" color="red" />}
                  {record.fibrinogen > 0 && <RecordItem label="Fibrinógeno" value={record.fibrinogen} unit="g" color="red" />}
                  {record.pcc > 0 && <RecordItem label="CCP" value={record.pcc} unit="U" color="red" />}
                  {record.factorVII > 0 && <RecordItem label="Factor VII" value={record.factorVII} unit="mg" color="red" />}

                  {/* Pérdidas */}
                  {record.insensibleLoss > 0 && <RecordItem label="Pérdida insensible" value={record.insensibleLoss} unit="ml" color="orange" />}
                  {record.ascites > 0 && <RecordItem label="Ascitis" value={record.ascites} unit="ml" color="orange" />}
                  {record.suction > 0 && <RecordItem label="Aspirador" value={record.suction} unit="ml" color="orange" />}
                  {record.gauze > 0 && <RecordItem label="Gasas" value={record.gauze} unit="ml" color="orange" />}
                  {record.urine > 0 && <RecordItem label="Diuresis" value={record.urine} unit="ml" color="orange" />}
                </div>

                {record.otherFluids && (
                  <div className="mt-3 pt-3 border-t border-dark-600 text-xs text-gray-400">
                    <span className="font-medium">Otros: </span>{record.otherFluids}
                  </div>
                )}

                {record.balance !== null && (
                  <div className="mt-3 pt-3 border-t border-dark-600 text-sm">
                    <span className="text-gray-400">Balance: </span>
                    <span className={`font-semibold ${record.balance >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                      {record.balance > 0 && '+'}{record.balance} ml
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            No hay registros de fluidos para esta fase.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente auxiliar para inputs de fluidos
function FluidInput({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min="0"
        className="w-full px-2 py-1 text-sm bg-dark-600 border border-dark-400 rounded focus:ring-1 focus:ring-surgical-500"
      />
    </div>
  );
}

// Componente auxiliar para mostrar items de registro
function RecordItem({ label, value, unit, color }) {
  const colorClasses = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
  };

  return (
    <div>
      <div className="text-gray-400">{label}</div>
      <div className={`font-semibold ${colorClasses[color]}`}>
        {value} {unit}
      </div>
    </div>
  );
}
