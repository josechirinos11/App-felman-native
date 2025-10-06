import mongoose, { Document, Schema } from 'mongoose';

export interface IUsuario {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface IEmpresa extends Document {
  nombre: string;
  contacto: string;
  direccion: string;
  email: string;
  statusSuscripcion: string;
  datosPago: any;
  usuarios: IUsuario[];
}

const UsuarioSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  rol: { type: String, required: true }
});

const EmpresaSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  contacto: { type: String },
  direccion: { type: String },
  email: { type: String, required: true },
  statusSuscripcion: { type: String },
  datosPago: { type: Schema.Types.Mixed },
  usuarios: [UsuarioSchema]
});

export default mongoose.model<IEmpresa>('Empresa', EmpresaSchema);
