import React from 'react';
import { StyleSheet } from 'react-native';
import AlmacenLayout from './_layout';

export default function Index() {
    return (
         <AlmacenLayout />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e78b7',
    },
});
