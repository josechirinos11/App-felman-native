import ADODB from 'node-adodb';

// Configuración para la base de datos Access
const accessConfig = {
    database: '\\\\SERVIDOR\\Ruta\\A\\Tu\\Base.mdb',
    provider: 'Microsoft.ACE.OLEDB.12.0' // Para .accdb usar este provider
    // provider: 'Microsoft.Jet.OLEDB.4.0' // Para .mdb usar este provider
};

class AccessDbManager {
    private static instance: AccessDbManager;
    private connection: any = null;

    private constructor() {}

    public static getInstance(): AccessDbManager {
        if (!AccessDbManager.instance) {
            AccessDbManager.instance = new AccessDbManager();
        }
        return AccessDbManager.instance;
    }

    public async connect(): Promise<boolean> {
        try {
            if (this.connection) {
                console.log('✅ Ya existe una conexión activa a Access');
                return true;
            }

            const connectionString = `Provider=${accessConfig.provider};` +
                                  `Data Source=${accessConfig.database};` +
                                  `Persist Security Info=False;`;
            
            console.log('🔄 Intentando conectar a Access...');
            console.log('📁 Base de datos:', accessConfig.database);
            
            this.connection = ADODB.open(connectionString);
            console.log('✅ Conexión exitosa a la base de datos Access');
            return true;
        } catch (error) {
            console.error('❌ Error al conectar con Access:', error);
            return false;
        }
    }

    public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        try {
            if (!this.connection) {
                throw new Error('No hay conexión activa con Access');
            }
            const result = await this.connection.query(sql, params);
            return result as T[];
        } catch (error) {
            console.error('❌ Error al ejecutar consulta en Access:', error);
            throw error;
        }
    }

    public async execute(sql: string, params: any[] = []): Promise<void> {
        try {
            if (!this.connection) {
                throw new Error('No hay conexión activa con Access');
            }
            await this.connection.execute(sql, params);
        } catch (error) {
            console.error('❌ Error al ejecutar comando en Access:', error);
            throw error;
        }
    }

    public async testConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT TOP 1 * FROM MSysObjects');
            console.log('✅ Prueba de conexión exitosa:', result);
            return true;
        } catch (error) {
            console.error('❌ Prueba de conexión fallida:', error);
            return false;
        }
    }

    public close(): void {
        try {
            if (this.connection) {
                this.connection = null;
                console.log('✅ Conexión a Access liberada correctamente');
            }
        } catch (error) {
            console.error('❌ Error al liberar la conexión:', error);
        }
    }
}

// Exportar una instancia singleton
export const accessDb = AccessDbManager.getInstance();
