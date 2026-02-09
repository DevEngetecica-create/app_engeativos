// src/components/IconCard.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { MaterialIcons } from '@expo/vector-icons'; // ou qualquer outra família

// Container do card
const CardContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: #fff;
  padding: 12px 16px;
  margin-vertical: 8px;
  margin-horizontal: 16px;
  border-radius: 8px;
  elevation: 2;  /* sombra Android */
  shadow-color: #000;  /* sombra iOS */
  shadow-offset: 0px 1px;
  shadow-opacity: 0.1;
  shadow-radius: 2px;
`;

// Caixa do ícone
const IconWrapper = styled.View`
  width: 40px;
  align-items: center;
  justify-content: center;
`;

// Conteúdo de texto
const Content = styled.View`
  flex: 1;
  margin-left: 12px;
`;

// Título e descrição
const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: #333;
`;

const CardSubtitle = styled.Text`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
`;

export default function IconCard({
  iconName,
  iconColor = '#007AFF',
  iconSize  = 24,
  title,
  subtitle,
  onPress
}) {
  return (
    <CardContainer activeOpacity={0.8} onPress={onPress}>
      <IconWrapper>
        <MaterialIcons name={iconName} size={iconSize} color={iconColor} />
      </IconWrapper>
      <Content>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardSubtitle>{subtitle}</CardSubtitle> : null}
      </Content>
    </CardContainer>
  );
}
