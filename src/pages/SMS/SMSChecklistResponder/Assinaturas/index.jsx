import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Image, TextInput } from "react-native";
import SignaturePad from "./signaturePad";
import styles, { AssinaturaContainer, BtnAssinar, TextoPadrao, Label } from "../styles";
import { useFocusEffect } from "@react-navigation/native";
import { loadAssinaturas, handleCPFChange, formatCPF } from "./assinaturas.functions";
import { ButtonRow, OptionButton, OptionText } from '../styles';


export default function Assinatura({ salvarAssinaturas, userName, realizado_id }) {
    const [assinaturas, setAssinaturas] = useState([
        { nome: userName, cpf: "", assinaturaUri: null, showSignature: false, index: "" },
    ]);

    const [state, setState] = useState({
        loading: true,
        assinaturas: [],
    });

    useFocusEffect(
        useCallback(() => {
            loadAssinaturas({ realizado_id, setState });
        }, [])
    );

    useEffect(() => {
        if (state.assinaturas && state.assinaturas.length > 0) {
            setAssinaturas(
                state.assinaturas.map(a => ({
                    ...a,
                    showSignature: false
                }))
            );
        }
    }, [state.assinaturas]);

    // console.log(state.assinaturas);
    // ➕ Adicionar nova assinatura
    const addNovaAssinatura = () => {
        setAssinaturas(prev => [
            ...prev,
            { nome: "", cpf: "", assinaturaUri: null, showSignature: false },
        ]);
    };

    // 💾 Salvar imagem da assinatura e chamar salvarAssinaturas
    const handleSaveAssinatura = (index, uri) => {
        const updated = [...assinaturas];
        updated[index].assinaturaUri = uri;
        updated[index].showSignature = false;
        setAssinaturas(updated);

        // chama a função externa passando o índice e os dados atualizados
        if (salvarAssinaturas) {
            salvarAssinaturas(index, updated[index]);
        }
    };

    // 👁️ Mostrar ou esconder o SignaturePad
    const setShowAssinatura = (index, value) => {
        const updated = [...assinaturas];
        updated[index].showSignature = value;
        setAssinaturas(updated);
    };

    // ✏️ Alterar nome/CPF
    const handleChangeAssinatura = (index, field, value) => {
        const updated = [...assinaturas];
        updated[index][field] = value;
        setAssinaturas(updated);
    };

    // ❌ Excluir assinatura
    const excluirAssinatura = (index) => {
        const updated = [...assinaturas];
        updated.splice(index, 1);
        setAssinaturas(updated);
    };

    return (
        <>
            {assinaturas.map((item, index) => (
                <AssinaturaContainer key={index}>
                    <View>
                        {/* Botão de seleção Interno / Externo (somente para índices > 0) */}
                        {index !=0 && index >= state.assinaturas.length && (
                            <ButtonRow style={{marginBottom:10}}>
                                <OptionButton
                                    selected={item.trabalhador_externo === 0}
                                    onPress={() => handleChangeAssinatura(index, "trabalhador_externo", 0)}
                                >
                                    <OptionText selected={item.trabalhador_externo === 0}>Interno</OptionText>
                                </OptionButton>

                                <OptionButton
                                    selected={item.trabalhador_externo === 1}
                                    onPress={() => {
                                        handleChangeAssinatura(index, "trabalhador_externo", 1);
                                        handleChangeAssinatura(index, "nome", ""); // Limpa o nome
                                        }}
                                >
                                    <OptionText selected={item.trabalhador_externo === 1}>Externo</OptionText>
                                </OptionButton>
                            </ButtonRow>
                        )}

                        {/* Mantém a lógica original: exibição apenas se index já existe */}
                        {state.assinaturas.length > index || index === 0 ? (
                            <TextoPadrao>{item.nome}</TextoPadrao>
                        ) : (
                            <>
                                {/* Exibição condicional dos campos de acordo com Interno/Externo */}
                                {item.trabalhador_externo !== null && item.trabalhador_externo !== undefined ? (
                                    <View>
                                        {item.trabalhador_externo === 0 ? (
                                            // Interno → CPF primeiro, depois Nome
                                            <>
                                                <Label>CPF:</Label>
                                                <TextInput
                                                    style={styles.input}
                                                    value={item.cpf}
                                                    onChangeText={text => handleCPFChange(index, formatCPF(text), handleChangeAssinatura)}
                                                    placeholder="Digite o CPF"
                                                    keyboardType="numeric"
                                                />

                                                <Label>Nome:</Label>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: "#f0f0f0", color: "#a0a0a0" }]}
                                                    value={item.nome}
                                                    onChangeText={text => handleChangeAssinatura(index, "nome", text)}
                                                    placeholder="-"
                                                    editable={false}
                                                />
                                            </>
                                        ) : (
                                            // Externo → Nome primeiro, depois CPF
                                            <>
                                                <Label>Nome:</Label>
                                                <TextInput
                                                    style={styles.input}
                                                    value={item.nome}
                                                    onChangeText={text => handleChangeAssinatura(index, "nome", text)}
                                                    placeholder="Digite o nome"
                                                />

                                                <Label>CPF:</Label>
                                                <TextInput
                                                    style={styles.input}
                                                    value={item.cpf}
                                                    onChangeText={text => handleChangeAssinatura(index, "cpf", formatCPF(text))}
                                                    placeholder="Digite o CPF"
                                                    keyboardType="numeric"
                                                />
                                            </>
                                        )}
                                    </View>
                                ) : null}
                            </>
                        )}
                    </View>

                    {/* Exibe assinatura se existir */}
                    {item.assinaturaUri && (
                        <View style={styles.assinaturaPlace}>
                            <View style={styles.assinaturaRotacionada}>
                                <Image
                                    source={{ uri: item.assinaturaUri }}
                                    style={styles.assinaturaImagem}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    )}

                    {/* Botões de assinar/excluir */}
                    {(state.assinaturas.length > index) || (
                        <>
                            {item.nome && item.nome!="Funcionario não encontrado" && (
                                <BtnAssinar onPress={() => setShowAssinatura(index, true)}>
                                    <Text style={styles.btnAssinarText}>
                                        {item.assinaturaUri ? "Assinado com Sucesso!" : "Assinar"}
                                    </Text>
                                </BtnAssinar>
                            )}

                            {index > 0 && (
                                <BtnAssinar
                                    onPress={() => excluirAssinatura(index)}
                                    style={{ backgroundColor: "#fc4848ff", marginTop: 5 }}
                                >
                                    <Text style={styles.btnAssinarText}>Excluir Assinatura</Text>
                                </BtnAssinar>
                            )}
                        </>
                    )}

                    {/* Signature Pad */}
                    <SignaturePad
                        visible={item.showSignature}
                        onClose={() => setShowAssinatura(index, false)}
                        onSave={uri => handleSaveAssinatura(index, uri)}
                        userName={item.nome}
                    />
                </AssinaturaContainer>
            ))}

            {/* Botão adicionar nova assinatura */}
            <BtnAssinar onPress={addNovaAssinatura} style={styles.btnNovaAssinatura}>
                <Text style={styles.btnAssinarText}>+ Nova assinatura</Text>
            </BtnAssinar>
        </>
    );


}
