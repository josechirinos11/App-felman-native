import mongoose, { Document, Schema } from 'mongoose';

export interface IUsuario extends Document {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  empresaId: mongoose.Types.ObjectId;
}

const UsuarioSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, required: true },
  empresaId: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true }
});

export default mongoose.model<IUsuario>('Usuario', UsuarioSchema);
