import bcrypt from 'bcryptjs';
import Empresa from '../models/mongooEmpresa';
import Usuario from '../models/mongooUsuario';

export async function mongooLogin(email: string, password: string) {
  // Buscar usuario en colección de usuarios
  const usuario = await Usuario.findOne({ email });
  if (usuario) {
    const match = await bcrypt.compare(password, usuario.password);
    if (match) {
      return { success: true, usuario };
    }
    return { success: false, error: 'Contraseña incorrecta' };
  }

  // Buscar usuario en empresas (usuarios embebidos)
  const empresa = await Empresa.findOne({ 'usuarios.email': email });
  if (empresa) {
    const usuarioEmpresa = empresa.usuarios.find((u: any) => u.email === email);
    if (usuarioEmpresa) {
      const match = await bcrypt.compare(password, usuarioEmpresa.password);
      if (match) {
        return { success: true, usuario: usuarioEmpresa, empresa };
      }
      return { success: false, error: 'Contraseña incorrecta' };
    }
  }

  return { success: false, error: 'Usuario no encontrado' };
}
