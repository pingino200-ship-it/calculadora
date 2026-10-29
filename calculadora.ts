const pantallaPrincipal = document.getElementById("pantalla-principal") as HTMLInputElement;
const pantallaParcial = document.getElementById("pantalla-parcial") as HTMLInputElement;

let ultimoResultado: string = "0";

function tokenizar(exp: string): string[] {
    let s = exp
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\s+/g, "");

    const tokens: string[] = [];
    let i = 0;

    while (i < s.length) {
        const char = s[i];

        if (char === "(" || char === ")") {
            tokens.push(char);
            i++;
        } else if (["+", "-", "*", "/", "%", "^", "√"].includes(char)) {
            const esUnarioMinus = char === "-" && (
                tokens.length === 0 ||
                tokens[tokens.length - 1] === "(" ||
                ["+", "-", "*", "/", "%", "^", "√"].includes(tokens[tokens.length - 1])
            );

            if (esUnarioMinus) {
                let numStr = "-";
                i++;
                while (i < s.length && (/[0-9.]/).test(s[i])) {
                    numStr += s[i];
                    i++;
                }
                if (numStr === "-") {
                    tokens.push("-1");
                    tokens.push("*");
                } else {
                    tokens.push(numStr);
                }
            } else {
                tokens.push(char);
                i++;
            }
        } else if ((/[0-9.]/).test(char)) {
            let numStr = "";
            while (i < s.length && (/[0-9.]/).test(s[i])) {
                numStr += s[i];
                i++;
            }
            tokens.push(numStr);
        } else {
            i++;
        }
    }

    const tokensConMult: string[] = [];
    for (let j = 0; j < tokens.length; j++) {
        tokensConMult.push(tokens[j]);
        if (j < tokens.length - 1) {
            const actual = tokens[j];
            const sig = tokens[j + 1];

            const actualEsValor = actual === ")" || !isNaN(Number(actual));
            const sigEsValor = sig === "(" || sig === "√" || !isNaN(Number(sig));

            if (actualEsValor && sig === "(") {
                tokensConMult.push("*");
            } else if (actual === ")" && sigEsValor) {
                tokensConMult.push("*");
            }
        }
    }

    return tokensConMult;
}

function evaluarTokensPlanos(tokens: string[]): number {
    if (tokens.length === 0) return 0;

    let idx = 0;
    let res = 0;

    if (tokens[idx] === "√") {
        idx++;
        res = Math.sqrt(Number(tokens[idx]));
        idx++;
    } else {
        res = Number(tokens[idx]);
        idx++;
    }

    while (idx < tokens.length) {
        const op = tokens[idx];
        idx++;

        if (idx >= tokens.length) break;

        let valSig = 0;
        if (tokens[idx] === "√") {
            idx++;
            valSig = Math.sqrt(Number(tokens[idx]));
            idx++;
        } else {
            valSig = Number(tokens[idx]);
            idx++;
        }

        switch (op) {
            case "+": res = res + valSig; break;
            case "-": res = res - valSig; break;
            case "*": res = res * valSig; break;
            case "/": res = valSig !== 0 ? res / valSig : NaN; break;
            case "%": res = res % valSig; break;
            case "^": res = Math.pow(res, valSig); break;
        }
    }

    return res;
}

function evaluarSinPrioridad(exp: string): string | null {
    try {
        let tokens = tokenizar(exp);
        if (tokens.length === 0) return null;

        while (tokens.includes("(")) {
            let ultimoApertura = tokens.lastIndexOf("(");
            let primeroCierre = tokens.indexOf(")", ultimoApertura);

            if (primeroCierre === -1) return null;

            const subTokens = tokens.slice(ultimoApertura + 1, primeroCierre);
            const subRes = evaluarTokensPlanos(subTokens);

            if (isNaN(subRes)) return null;

            tokens.splice(ultimoApertura, primeroCierre - ultimoApertura + 1, subRes.toString());
        }

        const resFinal = evaluarTokensPlanos(tokens);
        if (isNaN(resFinal) || !isFinite(resFinal)) return null;

        return String(Number(resFinal.toFixed(8)));
    } catch {
        return null;
    }
}

function actualizarResultadoParcial(): void {
    const valor = pantallaPrincipal.value;
    if (valor.trim() !== "" && valor !== "0") {
        const resParcial = evaluarSinPrioridad(valor);
        if (resParcial !== null) {
            pantallaParcial.innerText = `Ans = ${resParcial}`;
        }
    } else {
        pantallaParcial.innerText = `Ans = ${ultimoResultado}`;
    }
}

function insertarEnCursor(caracter: string): void {
    let insertarTexto = caracter;
    
    if (caracter === "√") {
        insertarTexto = "√()";
    }

    const inicio = pantallaPrincipal.selectionStart ?? pantallaPrincipal.value.length;
    const fin = pantallaPrincipal.selectionEnd ?? pantallaPrincipal.value.length;
    const valorActual = pantallaPrincipal.value;

    // Evitar estrictamente doble potencia consecutivo (^^)
    if (insertarTexto === "^" && inicio > 0 && valorActual[inicio - 1] === "^") {
        return; 
    }

    // Evitar operadores repetidos consecutivos innecesarios
    const operadores = ["+", "-", "*", "/", "%", "^"];
    if (operadores.includes(insertarTexto) && inicio > 0) {
        const charAnterior = valorActual[inicio - 1];
        if (operadores.includes(charAnterior) && insertarTexto !== "-") {
            if (charAnterior === insertarTexto) return;
        }
    }

    // Si hay un "0" inicial solitario, se reemplaza al escribir números o raíces
    if (valorActual === "0" && !["+", "-", "*", "/", "%", "^", "."].includes(insertarTexto)) {
        pantallaPrincipal.value = insertarTexto;
        const nuevaPos = insertarTexto.includes("()") ? insertarTexto.indexOf("(") + 1 : insertarTexto.length;
        pantallaPrincipal.setSelectionRange(nuevaPos, nuevaPos);
    } else {
        const nuevoValor = valorActual.slice(0, inicio) + insertarTexto + valorActual.slice(fin);
        pantallaPrincipal.value = nuevoValor;
        
        let nuevaPos = inicio + insertarTexto.length;
        if (insertarTexto.includes("()")) {
            nuevaPos = inicio + insertarTexto.indexOf("(") + 1;
        }
        pantallaPrincipal.setSelectionRange(nuevaPos, nuevaPos);
    }

    pantallaPrincipal.focus();
    actualizarResultadoParcial();
}

function borrarEnCursor(): void {
    const inicio = pantallaPrincipal.selectionStart ?? pantallaPrincipal.value.length;
    const fin = pantallaPrincipal.selectionEnd ?? pantallaPrincipal.value.length;
    const valorActual = pantallaPrincipal.value;

    if (inicio !== fin) {
        pantallaPrincipal.value = valorActual.slice(0, inicio) + valorActual.slice(fin);
        pantallaPrincipal.setSelectionRange(inicio, inicio);
    } else if (inicio > 0) {
        pantallaPrincipal.value = valorActual.slice(0, inicio - 1) + valorActual.slice(inicio);
        pantallaPrincipal.setSelectionRange(inicio - 1, inicio - 1);
    }

    if (pantallaPrincipal.value === "") {
        pantallaPrincipal.value = "0";
        pantallaPrincipal.setSelectionRange(1, 1);
    }
    pantallaPrincipal.focus();
    actualizarResultadoParcial();
}

function calcular(): void {
    const exp = pantallaPrincipal.value;
    if (exp.trim() === "") return;

    const resultado = evaluarSinPrioridad(exp);
    if (resultado !== null) {
        ultimoResultado = resultado;
        pantallaPrincipal.value = resultado;
    } else {
        pantallaPrincipal.value = "Error";
    }
    actualizarResultadoParcial();
}

function limpiar(): void {
    pantallaPrincipal.value = "0";
    actualizarResultadoParcial();
    pantallaPrincipal.focus();
}

// Interceptar y controlar todas las entradas del teclado físico con precisión
pantallaPrincipal.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
        e.preventDefault();
        calcular();
        return;
    }

    if (e.key === "Backspace") {
        e.preventDefault();
        borrarEnCursor();
        return;
    }

    if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        insertarEnCursor("√");
        return;
    }

    if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        insertarEnCursor("^");
        return;
    }

    // Mapear símbolos comunes del teclado numérico o principal
    let teclaValida = e.key;
    if (teclaValida === "x" || teclaValida === "X") teclaValida = "*";
    
    // Si es un número, operador, paréntesis o punto válido, pasarlo por la lógica de inserción
    if (/^[0-9+\-*/%.()^]$/.test(teclaValida)) {
        e.preventDefault();
        insertarEnCursor(teclaValida);
        return;
    }

    // Bloquear cualquier otra tecla que no deba estar ahí
    if (e.key.length === 1) {
        e.preventDefault();
    }
});

// Eventos de clics en la botonera
const botones = document.querySelectorAll(".btn");
botones.forEach(boton => {
    boton.addEventListener("click", () => {
        const valor = boton.getAttribute("data-valor");
        const accion = boton.getAttribute("data-accion");

        if (valor) {
            insertarEnCursor(valor);
        }

        if (accion) {
            if (accion === "limpiar") limpiar();
            if (accion === "borrar") borrarEnCursor();
            if (accion === "calcular") calcular();
        }
    });
});