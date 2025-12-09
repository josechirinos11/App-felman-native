import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUBSCRIPTION_PLANS = [
    {
        id: 'pyme',
        name: 'Pyme',
        price: '10€',
        description: 'Ideal para autónomos y pequeñas empresas.',
        features: ['1 Usuario', 'Gestión básica', 'Soporte por email'],
        color: '#4CAF50'
    },
    {
        id: 'team',
        name: 'Team',
        price: '100€',
        description: 'Para equipos en crecimiento que necesitan control.',
        features: ['Hasta 10 Usuarios', 'Módulos avanzados', 'Soporte prioritario'],
        color: '#2196F3'
    },
    {
        id: 'pro_team',
        name: 'Pro Team',
        price: '200€',
        description: 'Solución completa para grandes operaciones.',
        features: ['Usuarios ilimitados', 'API Access', 'Soporte 24/7', 'Personalización'],
        color: '#9C27B0'
    }
];

export default function SubscriptionScreen() {
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [iban, setIban] = useState('');
    const [titular, setTitular] = useState('');

    const handleSubscribe = () => {
        if (!selectedPlan) {
            Alert.alert('Selecciona un plan', 'Por favor elige uno de los planes disponibles.');
            return;
        }
        if (!iban || !titular) {
            Alert.alert('Datos incompletos', 'Por favor rellena los datos bancarios.');
            return;
        }

        // Aquí iría la lógica real de pago (Stripe, Pasarela bancaria, etc.)
        Alert.alert(
            'Solicitud Recibida',
            `Has solicitado el plan ${SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name}. Procesaremos tu pago y activaremos tu cuenta en breve.`,
            [{ text: 'Entendido', onPress: () => router.back() }]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Suscripción</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Elige tu Plan</Text>
                <Text style={styles.subtitle}>Selecciona el plan que mejor se adapte a tu empresa</Text>

                <View style={styles.plansContainer}>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                        <TouchableOpacity
                            key={plan.id}
                            style={[
                                styles.planCard,
                                selectedPlan === plan.id && styles.selectedPlanCard,
                                { borderColor: selectedPlan === plan.id ? plan.color : 'transparent' }
                            ]}
                            onPress={() => setSelectedPlan(plan.id)}
                        >
                            <View style={[styles.planHeader, { backgroundColor: plan.color }]}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <Text style={styles.planPrice}>{plan.price}<Text style={styles.period}>/mes</Text></Text>
                            </View>
                            <View style={styles.planBody}>
                                <Text style={styles.planDescription}>{plan.description}</Text>
                                {plan.features.map((feature, index) => (
                                    <View key={index} style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                            {selectedPlan === plan.id && (
                                <View style={styles.checkOverlay}>
                                    <Ionicons name="checkmark-circle" size={24} color={plan.color} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {selectedPlan && (
                    <View style={styles.paymentForm}>
                        <Text style={styles.formTitle}>Datos de Domiciliación (SEPA)</Text>
                        <Text style={styles.formSubtitle}>Introduce tu cuenta bancaria para el cobro mensual</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Titular de la cuenta</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre completo o Razón Social"
                                value={titular}
                                onChangeText={setTitular}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>IBAN</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ESXX XXXX XXXX XXXX XXXX XXXX"
                                value={iban}
                                onChangeText={setIban}
                                autoCapitalize="characters"
                            />
                        </View>

                        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
                            <Text style={styles.subscribeButtonText}>Confirmar Suscripción</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 16,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    plansContainer: {
        marginBottom: 30,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedPlanCard: {
        transform: [{ scale: 1.02 }],
    },
    planHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    planPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    period: {
        fontSize: 14,
        fontWeight: 'normal',
    },
    planBody: {
        padding: 16,
    },
    planDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#444',
    },
    checkOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    paymentForm: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 2,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    formSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    subscribeButton: {
        backgroundColor: '#2e78b7',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    subscribeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
