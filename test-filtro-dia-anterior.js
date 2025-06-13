// Prueba para validar la lógica del filtro del día anterior
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Datos de prueba
const entregasEjemplo = [
  { NoPedido: '001', FechaEnvio: '2025-06-11T10:00:00.000Z', Cliente: 'Cliente A' }, // Ayer
  { NoPedido: '002', FechaEnvio: '2025-06-12T10:00:00.000Z', Cliente: 'Cliente B' }, // Hoy
  { NoPedido: '003', FechaEnvio: '2025-06-10T10:00:00.000Z', Cliente: 'Cliente C' }, // Anteayer
  { NoPedido: '004', FechaEnvio: '2025-06-11T15:30:00.000Z', Cliente: 'Cliente D' }, // Ayer
];

console.log('Fecha actual:', new Date().toISOString().split('T')[0]);
console.log('Fecha de ayer:', getYesterdayDate());
console.log('\nEntregas de ejemplo:');
entregasEjemplo.forEach(e => {
  const fechaEntrega = new Date(e.FechaEnvio).toISOString().split('T')[0];
  console.log(`- ${e.NoPedido}: ${fechaEntrega} (${e.Cliente})`);
});

// Simular filtro del día anterior
const yesterday = getYesterdayDate();
const entregasFiltradas = entregasEjemplo.filter(e => {
  const fechaEntrega = new Date(e.FechaEnvio).toISOString().split('T')[0];
  return fechaEntrega === yesterday;
});

console.log('\nEntregas filtradas del día anterior:');
entregasFiltradas.forEach(e => {
  const fechaEntrega = new Date(e.FechaEnvio).toISOString().split('T')[0];
  console.log(`- ${e.NoPedido}: ${fechaEntrega} (${e.Cliente})`);
});

console.log(`\nTotal de entregas originales: ${entregasEjemplo.length}`);
console.log(`Total de entregas del día anterior: ${entregasFiltradas.length}`);
