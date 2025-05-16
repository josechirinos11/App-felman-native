declare module 'node-adodb' {
    interface Connection {
        query(sql: string, params?: any[]): Promise<any>;
        execute(sql: string, params?: any[]): Promise<void>;
    }

    function open(connection: string): Connection;
    
    export default {
        open
    };
}
