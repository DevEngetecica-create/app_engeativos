// Importar TouchableOpacity da biblioteca react-native
import { TouchableOpacity } from "react-native";

// Importar os ícones da biblioteca react-native-vector-icons.
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

// Importar o arquivo com os componentes CSS
import { Pagination, PaginationText, PaginationTextActive } from "../styles/custom";

// Criar o componente para paginação
function Paginate({ currentPage = 1, lastPage = 1 }) {

    return (
        <Pagination>

            {currentPage !== 1 && (
                <TouchableOpacity>
                    <PaginationText>
                        <MaterialCommunityIcons
                            name='chevron-double-left'
                            size={20}
                            color={'#c0c0c0'}
                        />
                    </PaginationText>
                </TouchableOpacity>
            )}

            {currentPage !== 1 && (
                <TouchableOpacity>
                    <PaginationText>
                        <MaterialCommunityIcons
                            name='chevron-left'
                            size={20}
                            color={'#c0c0c0'}
                        />
                    </PaginationText>
                </TouchableOpacity>
            )}

            <PaginationTextActive>
                {currentPage}
            </PaginationTextActive>

            {currentPage !== lastPage && (
                <TouchableOpacity>
                    <PaginationText>
                        <MaterialCommunityIcons
                            name='chevron-right'
                            size={20}
                            color={'#c0c0c0'}
                        />
                    </PaginationText>
                </TouchableOpacity>
            )}

            {currentPage !== lastPage && (
                <TouchableOpacity>
                    <PaginationText>
                        <MaterialCommunityIcons
                            name='chevron-double-right'
                            size={20}
                            color={'#c0c0c0'}
                        />
                    </PaginationText>
                </TouchableOpacity>
            )}

        </Pagination>
    )

}

// Exportar a função
export default Paginate;
