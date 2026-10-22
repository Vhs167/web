const canvas = document.getElementById("coordinateCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const centerX = width / 2;
const centerY = height / 2;

const scale = 64;

let points = [];

const ALLOWED_X = [-5, -4, -3, -2, -1, 0, 1, 2, 3];
const ALLOWED_R = [1, 1.5, 2, 2.5, 3];

Decimal.set({precision: 50, toExpNeg: -100, toExpPos: 100});


function drawCoordinates() {
    ctx.beginPath();

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';

    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);

    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - 5, 10);
    ctx.lineTo(centerX, 0);
    ctx.lineTo(centerX + 5, 10);
    ctx.stroke();

    ctx.font = "16px serif"
    ctx.fillText("y", centerX + 8, 10);

    ctx.beginPath();
    ctx.moveTo(width - 10, centerY + 5);
    ctx.lineTo(width, centerY);
    ctx.lineTo(width - 10, centerY - 5);
    ctx.stroke();

    ctx.fillText("x", width - 10, centerY - 10);


    for (let x = -2; x <= 2; x++) {
        const canvasX = centerX + x * scale;

        ctx.beginPath();
        ctx.moveTo(canvasX, centerY - 5);
        ctx.lineTo(canvasX, centerY + 5);
        ctx.stroke();

        let text;

        if (x === -2) {
            text = "-R";
        } else if (x === -1) {
            text = "-R/2";
        } else if (x === 1) {
            text = "R/2";
        } else if (x === 2) {
            text = "R";
        }

        if (text) {
            ctx.fillText(text, canvasX, centerY - 10);
        }


    }

    for (let y = -2; y <= 2; y++) {
        const canvasY = centerY - y * scale;

        ctx.beginPath();
        ctx.moveTo(centerX - 5, canvasY);
        ctx.lineTo(centerX + 5, canvasY);
        ctx.stroke();

        let text;

        if (y === -2) {
            text = "-R";
        } else if (y === -1) {
            text = "-R/2";
        } else if (y === 1) {
            text = "R/2";
        } else if (y === 2) {
            text = "R";
        }

        if (text) {
            ctx.fillText(text, centerX + 10, canvasY + 2);
        }

    }
}

function drawArea() {
    ctx.fillStyle = '#3399FF';

    const canvasR = scale * 2;
    const halfR = canvasR / 2;

    ctx.fillRect(centerX - halfR, centerY - canvasR, halfR, canvasR);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);

    ctx.arc(centerX, centerY, halfR, -Math.PI / 2, 0, false);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - canvasR, centerY);
    ctx.lineTo(centerX, centerY + canvasR);
    ctx.closePath();
    ctx.fill();
}

function drawPoint(points) {
    if (points.length === 0) return;

    points.forEach(p => {
        const xNum = parseFloat(p.x);
        const yNum = parseFloat(p.y);
        const rNum = parseFloat(p.r);

        if (!rNum || isNaN(rNum)) return;

        const canvasR = scale * 2;

        const pointX = centerX + (xNum / rNum) * canvasR;
        const pointY = centerY - (yNum / rNum) * canvasR;

        ctx.beginPath();
        ctx.arc(pointX, pointY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = p.hit ? '#2ecc71' :'#ed0707';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    });
}


function draw() {
    ctx.clearRect(0, 0, width, height);

    drawArea();

    drawCoordinates();

    drawPoint(points);
}


draw();

function parseDecimal(value, fieldName) {
    const normalized = String(value).trim().replace(",", ".");

    if (normalized === "") {
        throw new Error(`Введите ${fieldName}`);
    }

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
        throw new Error(`Некорректный формат числа ${fieldName}`);
    }

    return new Decimal(normalized);
}

function validateX(xValue) {
    if(xValue === null || xValue === undefined || String(xValue).trim() === "") {
        throw new Error("Выберите значение X")
    }
    const x = parseDecimal(xValue, "X");

    const xNum = x.toNumber();
    if (!ALLOWED_X.includes(xNum)) {
        throw new Error("X должен входить в набор допустимых значений");
    }
    return x;
}

function validateY(yValue) {
    if (yValue === null || yValue === undefined || String(yValue).trim() === "") {
        document.getElementById("y").classList.add("errorY");
    }

    const y = parseDecimal(yValue, "Y");

    if (y.lte(-5) || y.gte(5)) {
        document.getElementById("y").classList.add("errorY");
        throw new Error("Значение не входит в допустимые значения");
    }

    return parseDecimal(yValue, "Y");
}

function validateR() {
    const checkBoxes = document.querySelectorAll("input[name='r']:checked");
    if (checkBoxes.length === 0 ){
        throw new Error("Выберите хотя бы одно значение R")
    }
    const values = [];
    checkBoxes.forEach(box => {
        const val = parseDecimal(box.value.trim());
        const numVal = val.toNumber()
        if (!ALLOWED_R.includes(numVal)) {
            throw new Error("Недопустимое значение R: " + val);
        }
        values.push(val);
    });
    return values
}

const form = document.getElementById("pointForm");
const yInput = document.getElementById("y");


form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearError();

    points.length = 0;

    let x, y, rList;

    try {
        const checkedX = document.querySelector("input[name='x']:checked");
        x = validateX(checkedX ? checkedX.value : null);
        y = validateY(yInput.value);
        rList = validateR();
    } catch (err) {
        showError(err.message);
        return;
    }

    try {
        for (let r of rList) {
            const response = await fetch("/fcgi-bin/server.jar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                body: JSON.stringify({x: x.toFixed(), y: y.toFixed(), r: r.toFixed()})
            });



            const data = await response.json();

            if (!response.ok || data.error) {
                showError(data.error || "Ошибка сервера при обработке запроса");
                return;
            }

            const newPoint = {
                x: parseFloat(data.x),
                y: parseFloat(data.y),
                r: parseFloat(data.r),
                hit: data.result
            }

            points.push(newPoint);

            saveResult(data.x, data.y, data.r, data.result, data.currentTime, data.executionTime);
            addResultToTable(data.x, data.y, data.r, data.result, data.currentTime, data.executionTime);
        }

        draw();
    } catch (err) {
        showError("Не удалось связаться с сервером " + err.message)
    }

});


function addResultToTable(x, y, r, result, currentTime, executionTime) {
    const row = document.createElement("tr");
    row.classList.add(result ? "hit" : "miss");

    row.innerHTML = `
                    <td>${x}</td>
                    <td>${y}</td>
                    <td>${r}</td>
                    <td>${result ? "Попадание" : "Промах"}</td>
                    <td>${currentTime}</td>
                    <td>${executionTime}</td>
                    `;

    document.getElementById("resultBody").appendChild(row);
}

function saveResult(x, y, r, result, currentTime, executionTime) {
    const results = JSON.parse(localStorage.getItem("results")) || [];

    results.push({
        x: x,
        y: y,
        r: r,
        result: result,
        currentTime: currentTime,
        executionTime: executionTime
    });

    localStorage.setItem("results", JSON.stringify(results));
}

function loadResults() {
    const results = JSON.parse(localStorage.getItem("results")) || [];

    results.forEach(element => {
        addResultToTable(
            element.x,
            element.y,
            element.r,
            element.result,
            element.currentTime,
            element.executionTime
        );
    });
}

function showError(message) {
    document.getElementById("errorMessage").textContent = message;
}

function clearError() {
    document.getElementById("errorMessage").textContent = "";
}

loadResults();