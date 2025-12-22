import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

// Define types for the data structures
type Product = {
    code: string;
    desc: string;
    dicl: string;
    docl: string;
    bqty: string;
};

type Machining = {
    wcode: string | null;
    var1: string | null;
    var2: string | null;
    var3: string | null;
    angle: string | null;
    face: string | null;
    offset: string | null;
    offsety: string | null;
    offsetz: string | null;
    codutensile: string | null;
    comment: string;
};

type Cut = {
    id: string;
    angl: string;
    angr: string;
    il: string;
    ol: string;
    bcod: string;
    desc: string;
    idquadro: string;
    trolley: string;
    slot: string;
    labels: string[];
    machinings: Machining[];
};

type Bar = {
    id: string;
    brand: string;
    code: string;
    dicl: string;
    docl: string;
    len: string;
    lenr: string;
    h: string;
    w: string;
    mlt: string;
    cuts: Cut[];
};

type XMLData = {
    products: Product[];
    bars: Bar[];
};

const XMLProfileAnalyzer = () => {
    // Platform check: If not web, show message
    if (Platform.OS !== 'web') {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="desktop-outline" size={64} color="#64748b" />
                <Text style={styles.mobileMessage}>
                    Este módulo está diseñado únicamente para su uso en la versión Web.
                </Text>
                <Text style={styles.mobileSubMessage}>
                    Por favor, acceda desde un navegador para utilizar el analizador de perfiles.
                </Text>
            </View>
        );
    }

    // Web Implementation
    const [xmlData, setXmlData] = useState<XMLData | null>(null);
    const [expandedBars, setExpandedBars] = useState<{ [key: string]: boolean }>({});
    const [expandedCuts, setExpandedCuts] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const { width } = useWindowDimensions();
    const isMobileWeb = width < 768; // Simple responsive check

    const parseXML = (xmlText: string) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const getTextContent = (parent: Element, tagName: string) => {
                const element = parent.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };

            const getAllElements = (parent: Element, tagName: string) => {
                return Array.from(parent.getElementsByTagName(tagName));
            };

            const job = xmlDoc.getElementsByTagName('JOB')[0];
            if (!job) throw new Error("Formato XML inválido: No se encontró la etiqueta JOB");

            const head = job.getElementsByTagName('HEAD')[0];
            const body = job.getElementsByTagName('BODY')[0];

            // Parse header products
            const products = getAllElements(head, 'PDAT').map(pdat => ({
                code: getTextContent(pdat, 'CODE'),
                desc: getTextContent(pdat, 'DESC'),
                dicl: getTextContent(pdat, 'DICL'),
                docl: getTextContent(pdat, 'DOCL'),
                bqty: getTextContent(pdat, 'BQTY')
            }));

            // Parse bars
            const bars = getAllElements(body, 'BAR').map((bar, barIndex) => {
                const cuts = getAllElements(bar, 'CUT').map((cut, cutIndex) => {
                    const machinings = getAllElements(cut, 'MACHINING').map(mach => {
                        const allComentarios = Array.from(cut.querySelectorAll('Comentario1'));
                        const prevSib = mach.previousElementSibling;
                        const index = allComentarios.indexOf(prevSib as Element);

                        let comment = '';
                        if (index !== -1 && prevSib?.tagName === 'Comentario1') {
                            comment = prevSib.textContent || '';
                        }
                        if (!comment) {
                            const target = cut.querySelector(`Comentario1:nth-of-type(${Array.from(cut.querySelectorAll('Comentario1')).indexOf(mach.previousElementSibling as Element) + 1})`);
                            comment = target?.textContent || '';
                        }

                        return {
                            wcode: mach.getAttribute('WCODE'),
                            var1: mach.getAttribute('VAR1'),
                            var2: mach.getAttribute('VAR2'),
                            var3: mach.getAttribute('VAR3'),
                            angle: mach.getAttribute('ANGLE'),
                            face: mach.getAttribute('FACE'),
                            offset: mach.getAttribute('OFFSET'),
                            offsety: mach.getAttribute('OFFSETY'),
                            offsetz: mach.getAttribute('OFFSETZ'),
                            codutensile: mach.getAttribute('CODUTENSILE'),
                            comment: comment
                        };
                    });

                    return {
                        id: `bar${barIndex}-cut${cutIndex}`,
                        angl: getTextContent(cut, 'ANGL'),
                        angr: getTextContent(cut, 'ANGR'),
                        il: getTextContent(cut, 'IL'),
                        ol: getTextContent(cut, 'OL'),
                        bcod: getTextContent(cut, 'BCOD'),
                        desc: getTextContent(cut, 'DESC'),
                        idquadro: getTextContent(cut, 'IDQUADRO'),
                        trolley: getTextContent(cut, 'TROLLEY'),
                        slot: getTextContent(cut, 'SLOT'),
                        labels: getAllElements(cut, 'LBL').map(lbl => lbl.textContent || '').filter(l => l),
                        machinings
                    };
                });

                return {
                    id: `bar${barIndex}`,
                    brand: getTextContent(bar, 'BRAN'),
                    code: getTextContent(bar, 'CODE'),
                    dicl: getTextContent(bar, 'DICL'),
                    docl: getTextContent(bar, 'DOCL'),
                    len: getTextContent(bar, 'LEN'),
                    lenr: getTextContent(bar, 'LENR'),
                    h: getTextContent(bar, 'H'),
                    w: getTextContent(bar, 'W'),
                    mlt: getTextContent(bar, 'MLT'),
                    cuts
                };
            });

            return { products, bars };
        } catch (e: any) {
            console.error(e);
            throw new Error(e.message || "Error al analizar XML");
        }
    };

    const handleFileUpload = (event: any) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = e.target?.result;
                    if (typeof result === 'string') {
                        const parsed = parseXML(result);
                        setXmlData(parsed);
                        setExpandedBars({});
                        setExpandedCuts({});
                        setError(null);
                    }
                } catch (error: any) {
                    setError('Error al procesar el archivo XML: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };

    const toggleBar = (barId: string) => {
        setExpandedBars(prev => ({ ...prev, [barId]: !prev[barId] }));
    };

    const toggleCut = (cutId: string) => {
        setExpandedCuts(prev => ({ ...prev, [cutId]: !prev[cutId] }));
    };

    // Hidden input for file upload using createElement to avoid TS/Native issues
    const FileInput = () => React.createElement('input', {
        type: 'file',
        accept: '.xml',
        onChange: handleFileUpload,
        style: { display: 'none' },
        id: 'xml-upload-input'
    });

    const triggerFileUpload = () => {
        const input = document.getElementById('xml-upload-input');
        input?.click();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Ionicons name="document-text-outline" size={32} color="#2563eb" />
                    <Text style={styles.title}>Analizador de Perfiles XML - Mecanizado</Text>
                </View>
                <Text style={styles.subtitle}>Sube tu archivo XML para visualizar cortes y mecanizados</Text>

                <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={triggerFileUpload}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-upload-outline" size={32} color="#2563eb" />
                    <Text style={styles.uploadText}>Seleccionar archivo XML</Text>
                </TouchableOpacity>
                <FileInput />
                {error && <Text style={styles.errorMessage}>{error}</Text>}
            </View>

            {xmlData && (
                <>
                    {/* Products Section */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Productos en el Pedido</Text>
                        <View style={styles.grid}>
                            {xmlData.products.map((prod, idx) => (
                                <View key={idx} style={[styles.productCard, isMobileWeb ? styles.fullWidth : styles.halfWidth]}>
                                    <Text style={styles.productCode}>Código: {prod.code}</Text>
                                    <Text style={styles.productDesc}>{prod.desc}</Text>
                                    <View style={styles.productFooter}>
                                        <Text style={styles.productInfo}>Color: {prod.dicl}</Text>
                                        <Text style={styles.productInfo}>Cant: {prod.bqty}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Bars and Cuts Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitleMajor}>Perfiles y Cortes</Text>
                        {xmlData.bars.map((bar) => (
                            <View key={bar.id} style={styles.barContainer}>
                                <TouchableOpacity
                                    style={styles.barHeader}
                                    onPress={() => toggleBar(bar.id)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.rowCenter}>
                                        <Ionicons
                                            name={expandedBars[bar.id] ? "chevron-down" : "chevron-forward"}
                                            size={24}
                                            color="#fff"
                                        />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.barTitle}>Perfil: {bar.code}</Text>
                                            <Text style={styles.barSubtitle}>
                                                {bar.brand} | Longitud: {bar.len}mm | Dimensiones: {bar.h}x{bar.w}mm
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {bar.cuts.length} corte{bar.cuts.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {expandedBars[bar.id] && (
                                    <View style={styles.barContent}>
                                        {bar.cuts.map((cut) => (
                                            <View key={cut.id} style={styles.cutCard}>
                                                <TouchableOpacity
                                                    style={styles.cutHeader}
                                                    onPress={() => toggleCut(cut.id)}
                                                >
                                                    <View style={styles.rowCenter}>
                                                        <Ionicons
                                                            name={expandedCuts[cut.id] ? "chevron-down" : "chevron-forward"}
                                                            size={20}
                                                            color="#475569"
                                                        />
                                                        <Ionicons name="cut-outline" size={20} color="#ea580c" style={{ marginHorizontal: 8 }} />
                                                        <View>
                                                            <Text style={styles.cutTitle}>
                                                                Corte: {cut.desc} (ID: {cut.idquadro})
                                                            </Text>
                                                            <Text style={styles.cutSubtitle}>
                                                                Áng: {cut.angl}° → {cut.angr}° | Int: {cut.il}mm | Ext: {cut.ol}mm
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.rowGap}>
                                                        <View style={[styles.tag, { backgroundColor: '#dbeafe' }]}>
                                                            <Text style={[styles.tagText, { color: '#1e40af' }]}>Trolley {cut.trolley}</Text>
                                                        </View>
                                                        <View style={[styles.tag, { backgroundColor: '#f3e8ff' }]}>
                                                            <Text style={[styles.tagText, { color: '#6b21a8' }]}>{cut.machinings.length} mec.</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {expandedCuts[cut.id] && (
                                                    <View style={styles.cutDetails}>
                                                        {cut.labels.length > 0 && (
                                                            <View style={styles.mb4}>
                                                                <Text style={styles.labelTitle}>Etiquetas:</Text>
                                                                <View style={styles.rowWrap}>
                                                                    {cut.labels.map((label, idx) => (
                                                                        <View key={idx} style={styles.labelTag}>
                                                                            <Text style={styles.labelTagText}>{label}</Text>
                                                                        </View>
                                                                    ))}
                                                                </View>
                                                            </View>
                                                        )}

                                                        <View style={[styles.rowCenter, styles.mb2]}>
                                                            <Ionicons name="construct-outline" size={18} color="#16a34a" />
                                                            <Text style={styles.machiningTitle}> Mecanizados ({cut.machinings.length})</Text>
                                                        </View>

                                                        <View style={styles.machiningList}>
                                                            {cut.machinings.map((mach, idx) => (
                                                                <View key={idx} style={styles.machiningCard}>
                                                                    {mach.comment ? (
                                                                        <Text style={styles.machiningComment}>{mach.comment}</Text>
                                                                    ) : null}
                                                                    <View style={styles.gridTight}>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>Cód:</Text> {mach.wcode}</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>Cara:</Text> {mach.face}</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>Áng:</Text> {mach.angle}°</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>Ute:</Text> {mach.codutensile}</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>Off:</Text> {mach.offset}</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>OffY:</Text> {mach.offsety}</Text>
                                                                        <Text style={styles.machiningText}><Text style={styles.bold}>OffZ:</Text> {mach.offsetz}</Text>
                                                                        {mach.var1 && <Text style={styles.machiningText}><Text style={styles.bold}>V1:</Text> {mach.var1}</Text>}
                                                                        {mach.var2 && <Text style={styles.machiningText}><Text style={styles.bold}>V2:</Text> {mach.var2}</Text>}
                                                                    </View>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc', // slate-50
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 48,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 20,
    },
    mobileMessage: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155',
        marginTop: 16,
        textAlign: 'center',
    },
    mobileSubMessage: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b', // slate-800
        marginLeft: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#475569', // slate-600
        marginBottom: 24,
    },
    uploadArea: {
        width: '100%',
        height: 128,
        backgroundColor: '#eff6ff', // blue-50
        borderWidth: 2,
        borderColor: '#93c5fd', // blue-300
        borderStyle: 'dashed',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer', // web only, harmless on native
    },
    uploadText: {
        marginTop: 8,
        color: '#2563eb', // blue-600
        fontWeight: '500',
        fontSize: 16,
    },
    errorMessage: {
        color: '#dc2626',
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    sectionTitleMajor: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridTight: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    productCard: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    fullWidth: {
        width: '100%',
    },
    halfWidth: {
        width: '31%', // Approximate for 3 cols with gap
        minWidth: 250,
    },
    productCode: {
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 8,
    },
    productDesc: {
        fontSize: 14,
        color: '#475569',
    },
    productFooter: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    productInfo: {
        fontSize: 12,
        color: '#64748b',
    },
    sectionContainer: {
        marginBottom: 16,
    },
    barContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    barHeader: {
        backgroundColor: '#2563eb', // blue-600
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    barTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    barSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        color: 'white',
        fontSize: 14,
    },
    barContent: {
        padding: 16,
        backgroundColor: '#f8fafc',
        gap: 12,
    },
    cutCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cutHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cutTitle: {
        fontWeight: '600',
        color: '#1e293b',
        fontSize: 16,
    },
    cutSubtitle: {
        fontSize: 14,
        color: '#475569',
    },
    rowGap: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    cutDetails: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        padding: 16,
        backgroundColor: '#f8fafc',
    },
    labelTitle: {
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    rowWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    labelTag: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    labelTagText: {
        fontSize: 12,
        color: '#334155',
    },
    mb4: {
        marginBottom: 16,
    },
    mb2: {
        marginBottom: 8,
    },
    machiningTitle: {
        fontWeight: '600',
        color: '#334155',
        marginLeft: 8,
    },
    machiningList: {
        gap: 8,
    },
    machiningCard: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    machiningComment: {
        fontWeight: '500',
        color: '#1d4ed8', // blue-700
        marginBottom: 6,
        fontSize: 14,
    },
    machiningText: {
        fontSize: 12,
        color: '#334155',
        minWidth: 80,
    },
    bold: {
        fontWeight: '600',
    },
});

export default XMLProfileAnalyzer;