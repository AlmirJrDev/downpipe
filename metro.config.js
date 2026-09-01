// NativeWind v4 precisa deste arquivo. É o `withNativeWind` no Metro que
// compila o global.css/tailwind.config.js e injeta os estilos no bundle.
// Sem ele o babel transforma o JSX, mas nenhuma classe existe em runtime e
// todo `className` é descartado silenciosamente — só o `style={{}}` inline
// continua funcionando.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
