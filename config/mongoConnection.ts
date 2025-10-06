import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

export const connectMongo = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as any);
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    throw error;
  }
};
