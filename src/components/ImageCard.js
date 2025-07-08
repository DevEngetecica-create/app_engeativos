// src/components/ImageCard.js
import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import styled from 'styled-components/native';

const CardContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: #fff;
  padding: 12px 16px;
  margin-vertical: 8px;
  margin-horizontal: 16px;
  border-radius: 8px;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.1;
  shadow-radius: 2px;
`;

const IconWrapper = styled.View`
  width: 40px;
  align-items: center;
  justify-content: center;
`;

const Content = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: #333;
  padding-left: 12px;
`;

const CardSubtitle = styled.Text`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  padding-left: 12px;
`;

export default function ImageCard({
  imageSource,    // require('../assets/car.png') ou { uri: 'https://...' }
  imageWidth = 32,
  imageHeight = 32,
  title,
  subtitle,
  onPress
}) {
  return (
    <CardContainer activeOpacity={0.8} onPress={onPress}>
      <IconWrapper>
        <Image
          source={imageSource}
          style={{ width: imageWidth, height: imageHeight, resizeMode: 'contain' }}
        />
      </IconWrapper>
      <Content>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardSubtitle>{subtitle}</CardSubtitle> : null}
      </Content>
    </CardContainer>
  );
}
