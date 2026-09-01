// No celular é o Alert do sistema. O par deste arquivo (alert.web.tsx) o
// substitui por um diálogo próprio no navegador, onde o react-native-web
// simplesmente não implementa Alert — chamar lá quebraria com TypeError
// justamente em sair da conta e excluir.
export { Alert } from "react-native";
