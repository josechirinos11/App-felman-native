import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { API_URL } from '../config/constants';

export default function SQLModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSQL = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/control-terminales/sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setResult(data);
            } else if (data.status === 'error') {
                setError(data.detail || 'Error al ejecutar SQL');
            } else {
                setResult([]);
            }
        } catch (e: any) {
            setError(e.message || 'Error al conectar');
        } finally {
            setLoading(false);
        }
    };

    const renderTable = () => {
        if (!result.length) return null;
        const headers = Object.keys(result[0]);
        return (
            <View style={{ marginTop: 10 }}>
                <ScrollView horizontal>
                    <View style={{ minWidth: '100%' }}>
                        <View style={styles.tableRowHeader}>
                            {headers.map((h, idx) => (
                                <Text key={idx} style={[styles.cell, styles.headerCell]}>{h}</Text>
                            ))}
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {result.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.tableRow}>
                                    {headers.map((h, colIndex) => (
                                        <Text key={colIndex} style={styles.cell}>
                                            {String(row[h])}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>

        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>Consulta SQL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe tu consulta SQL aquí"
                        multiline
                        value={query}
                        onChangeText={setQuery}
                    />
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={fetchSQL} style={styles.button}>
                            <Text style={styles.buttonText}>Ejecutar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={[styles.button, styles.closeButton]}>
                            <Text style={styles.buttonText}>Cerrar</Text>
                        </TouchableOpacity>
                        {result.length > 0 && (
  <Text style={styles.resultCount}>Total de filas: {result.length}</Text>
)}

               
                    </View>
                    {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {renderTable()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: '90%',
        elevation: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e78b7',
        textAlign: 'center',
        marginBottom: 12,
    },
    input: {
        height: 100,
        borderColor: '#2e78b7',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    button: {
        backgroundColor: '#2e78b7',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    closeButton: {
        backgroundColor: '#999',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        marginTop: 10,
        textAlign: 'center',
    },
    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#dbeafe',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    tableRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    cell: {
        padding: 8,
        minWidth: 100,
        flex: 1,
        borderRightWidth: 1,
        borderColor: '#ccc',
    },

    headerCell: {
        fontWeight: 'bold',
        color: '#1d4ed8',
    },
    resultCount: {
  marginTop: 10,
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#2e78b7',
  fontSize: 14,
},

});
