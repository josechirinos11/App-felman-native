const formatearFechaASemana = (fechaString) => {
  try {
    const fecha = new Date(fechaString);
    
    if (isNaN(fecha.getTime())) {
      return fechaString;
    }
    
    const dia = fecha.getDate();
    const semana = Math.ceil(dia / 7);
    
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    
    const mes = meses[fecha.getMonth()];
    
    return `SEMANA ${semana} DE ${mes}`;
  } catch (error) {
    console.log('Error al formatear fecha:', error);
    return fechaString;
  }
};

// Probar con el ejemplo proporcionado
console.log('Fecha: 2025-06-19 -> ' + formatearFechaASemana('2025-06-19'));

// Probar con más ejemplos
console.log('Fecha: 2025-06-01 -> ' + formatearFechaASemana('2025-06-01'));
console.log('Fecha: 2025-06-07 -> ' + formatearFechaASemana('2025-06-07'));
console.log('Fecha: 2025-06-08 -> ' + formatearFechaASemana('2025-06-08'));
console.log('Fecha: 2025-06-15 -> ' + formatearFechaASemana('2025-06-15'));
console.log('Fecha: 2025-06-22 -> ' + formatearFechaASemana('2025-06-22'));
console.log('Fecha: 2025-06-29 -> ' + formatearFechaASemana('2025-06-29'));
