// Importar a dependência para criar CSS em componentes
import styled from "styled-components/native";

// Importar as cores
import theme from "./theme";

// Inicio personalização login
export const Main = styled.SafeAreaView`
    position: relative;
    flex: 1;
    align-items: center;
    justify-content: center;
    background-color: ${theme.colors.white};

`;

export const Logo = styled.View`
    position: absolute;
    margin-bottom: 50px;
    top: 70px;    
`;

export const LogoNewUser = styled.View`
    position: absolute;
    margin-bottom: 50px;
    top: 30px;    
`;

export const ImageLogo = styled.Image`
    width: 320px;
    height: 320px;
`;

export const ContainerLogin = styled.SafeAreaView`
    positino: relative;
    width: 90%;
    top: 100px;
    background-color: ${theme.colors.white};
    align-items: center;
    justify-content: center;
`;

export const ContainerNewUser = styled.View`    
    width: 90%;
    top: 100px;
    background-color: ${theme.colors.white};
    align-items: center;
    justify-content: center;
`;

export const InputForm = styled.TextInput`
    background-color: ${theme.colors.lightGray};
    width: 100%;
    margin-bottom: 15px;
    color: ${theme.colors.darkGray};
    font-size: 18px;
    border-radius: 6px;
    padding: 10px;
`;

export const BtnSubmitForm = styled.Pressable`
    background-color: ${theme.colors.primary};
    width: 90%;
    height: 45px;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
`;

export const TxtSubmitForm = styled.Text`
    color: ${theme.colors.lightGray};
    font-size: 18px;
`;

export const LogoFooter = styled.View`
  position: absolute;
  bottom: 25px;
  left: 0;
  right: 0;
  align-items: center;
`;

export const ImageFooter = styled.Image`
    width: 320px;
    height: 29px;
`;

export const LinkUrl = styled.Text`
    color: ${theme.colors.primary};
    margin-top: 10px;
    font-size: 14px;
    
`;
export const BtnPressedSubmitForm = (pressed) => ({
    backgroundColor: pressed ? theme.colors.primaryDark : theme.colors.primary,
});

export const LinkLogin = styled.Text`
    color: ${theme.colors.primary};
    margin-top: 10px;
    font-size: 16px;
`;

export const LoadingArea = styled.View`
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    color: ${theme.colors.blackTransparent};
    align-items: center;
    justify-content: center;
`;

// Inicio personalização dashboard
export const Container = styled.SafeAreaView`
    background-color: ${theme.colors.lightGray};
    flex: 1;
    padding: 8px;
    flex-direction: column;
    justify-content: flex-start;
    align-self: stretch;
`;

export const List = styled.View`
    width: 100%;
`;

export const RowDataHome = styled.TouchableOpacity`
    background-color: ${theme.colors.white};
    padding: 15px 10px;
    margin: 5px 0;
    border-radius: 6px;
    align-items: center;
    border-width: 1px; 
    border-color: ${theme.colors.lightGray}; 
    border-style: solid; 
`;

export const SpaceBetweenHome = styled.View`
    margin-bottom: 10px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex: 1; 
`;

export const TextHome = styled.Text`
    color: ${props => props.color || theme.colors.blueGray};
    flex: 1; 
    font-size: 18px;
`;

export const TextHomeSuccess = styled.Text`
    color: ${props => props.color || theme.colors.green};
    flex: 1; 
    font-size: 18px;
`;

export const TextHomeDanger = styled.Text`
    color: ${props => props.color || theme.colors.red};
    flex: 1; 
    font-size: 18px;
`;

export const ValueHome = styled.Text`
    color: ${theme.colors.blueGray};
    font-size: 18px;
`;

export const ContentSpaceBetweenHome = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex: 1; 
`;

export const ValueHomeDanger = styled.Text`
    color: ${theme.colors.red};
    font-size: 18px;
`;

export const VerticalBarDanger = styled.View`
    width: 3px;
    height: 100%;
    background-color: ${theme.colors.red};
    margin-right: 10px; 
`;

export const ValueHomeContent = styled.Text`
    color: ${props => props.color || theme.colors.green};
    font-size: 18px;
    flex-shrink: 0; 
`;

export const VerticalBarContent = styled.View`
    width: 3px;
    height: 100%;
    background-color: ${props => props.color || theme.colors.green};
    margin-right: 10px; 
`;

export const ValueHomeSuccess = styled.Text`
    color: ${props => props.color || theme.colors.green};
    font-size: 18px;
    flex-shrink: 1; 
`;

export const VerticalBarSuccess = styled.View`
    width: 3px;
    height: 100%;
    background-color: ${props => props.color || theme.colors.green};
    margin-right: 10px; 
`;

export const ValueHomeWarning = styled.Text`
    color: ${theme.colors.orange};
    font-size: 18px;
`;

export const VerticalBarWarning = styled.View`
    width: 3px;
    height: 100%;
    background-color: ${theme.colors.orange};
    margin-right: 10px; 
`;

// Inicio listar despesas
export const TextSubTitleBilly = styled.Text`
    color: ${theme.colors.blueGray};
    font-size: 14px;
`;

export const SpaceBetweenBilly = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;   
    flex: 1; 
`;

// Inicio da paginação
export const Pagination = styled.View`
    padding: 10px;
    flex-direction: row;
    justify-content: center;
    align-items: center;
`;

export const PaginationText = styled.Text`   
    background-color: ${props => props.color || theme.colors.white}; 
    font-size: 16px;
    padding: 12px;
    margin: 3px;
    border-radius: 6px;
`;

export const PaginationTextActive = styled.Text`
    color: ${props => props.color || theme.colors.blueGray};
    background-color: ${props => props.color || theme.colors.white};
    font-size: 16px;
    padding: 12px;
    margin: 3px;
    border-radius: 6px;
`;

