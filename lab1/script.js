const canvas = document.getElementById("coordinateCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const centerX = width / 2;
const centerY = height / 2;

const scale = 64;


const ALLOWED_R = ["1", "1.5", "2", "2.5", "3"];
const ALLOWED_Y = ["-2", "-1.5", "-1", "-0.5", "0", "0.5", "1", "1.5", "2"];

Decimal.set({precision: 50});


function drawCoordinates(){
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





for(let x = -2; x <= 2; x++){
    const canvasX = centerX + x * scale;

    ctx.beginPath();
    ctx.moveTo(canvasX, centerY - 5);
    ctx.lineTo(canvasX, centerY + 5);
    ctx.stroke();

    let text;

    if(x === -2){
        text = "-R";
    }
    else if(x === -1){
        text = "-R/2";
    }
    else if(x === 1){
        text = "R/2";
    }
    else if(x === 2){
        text = "R";
    }

    if(text){
        ctx.fillText(text, canvasX, centerY - 10);
    }

    
}

for(let y = -2; y <= 2; y++){
    const canvasY = centerY - y * scale;

    ctx.beginPath();
    ctx.moveTo(centerX - 5, canvasY);
    ctx.lineTo(centerX + 5, canvasY);
    ctx.stroke();

    let text;

        if(y === -2){
            text = "-R";
        }
        else if(y === -1){
            text = "-R/2";
        }
        else if(y === 1){
            text = "R/2";
        }
        else if(y === 2){
            text = "R";
        }

        if(text){
            ctx.fillText(text, centerX + 10, canvasY + 2);
        }

    }
}

function drawArea(){
    const canvasR = 2 * scale;
    ctx.fillStyle = '#3399FF';
    ctx.beginPath();
    ctx.fillRect(centerX, centerY, -canvasR, canvasR );

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + canvasR, centerY);
    ctx.lineTo(centerX, centerY + canvasR / 2);

    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, canvasR / 2, - Math.PI / 2, 0);
    ctx.closePath();
    ctx.fill();

}

function drawPoint(x, y, r) {
    const xNum = x.toNumber();
    const yNum = y.toNumber();
    const rNum = r.toNumber();

    const pointX = centerX + xNum * scale / (rNum / 2);
    const pointY = centerY - yNum * scale / (rNum / 2);

    ctx.beginPath();
    ctx.arc(pointX, pointY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ed0707';
    ctx.fill();
}

let lastPoint = null;

function draw(){
    ctx.clearRect(0, 0, width, height);

    drawArea();

    drawCoordinates();

    if(lastPoint !== null){
        drawPoint(lastPoint.x, lastPoint.y, lastPoint.r);
    }


}


draw();


function parceDecimal(value, fieldName) {
    const normalized = String(value).trim().replace(",",".");

    if(normalized === "") {
        throw new Error(`Введите ${fieldName}`);
    }

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
        throw new Error(`Некорректный формат числа ${fieldName}`);
    }

    return new Decimal(normalized);
}

function validateX(xValue) {
    const x = parceDecimal(xValue, "X");

    if(x.lt(-3) || x.gt(5)) {
        throw new Error("X должен быть числом от -3 до 5");
    }
    return x;
}

function validateY(yValue) {
    if (yValue === null || yValue === undefined || String(yValue).trim() === "") {
        throw new Error("Выберите значение Y");
    }
    if(!ALLOWED_Y.includes(yValue)) {
        throw new Error("Значение не входит в допустимые значения");
    }

    return parceDecimal(yValue, "Y");
}

function validateR(rValue) {
    const rStr = String(rValue).trim().replace(",", ".");

    if(!ALLOWED_R.includes(rStr)) {
        throw new Error("Выберите корректное значение R");
    }

    return new Decimal(rStr);
}

function checkPoint(x, y, r){
    const halfR = r.div(2);

    const inRectangle = x.gte(r.neg()) && x.lte(0) && y.gte(r.neg()) && y.lte(0);

    const inCircle = x.gte(0) && y.gte(0) && x.mul(x).plus(y.mul(y)).lte(halfR.mul(halfR));

    const inTriangle = x.gte(0) && y.lte(0) && y.gte(x.div(2).minus(halfR)) && x.lte(r);

    return inRectangle || inCircle || inTriangle;
}



const form = document.getElementById("pointForm");
const xInput = document.getElementById("x");
const rInput = document.getElementById("r");



form.addEventListener("submit", function(event) {
    event.preventDefault();
    clearError();

    let x, y, r;

    try {
        x = validateX(xInput.value);
        y = validateY(document.querySelector("input[name='y']:checked")?.value);    
        r = validateR(rInput.value);
    } catch (err) {
        showError(err.message);
        return;
    }

    lastPoint = {
        x: x,
        y: y,
        r: r
    };

    draw();

    const result = checkPoint(x, y.plus(r), r);
    const date = new Date();
    
    saveResult(x, y.plus(r), r, result, date.toISOString());

    addResultTotable(x, y.plus(r), r, result, date.toLocaleString("ru-RU"));
});



function addResultTotable(x, y, r, result, date){
    const row = document.createElement("tr");

    row.innerHTML = `
                    <td>${x}</td>
                    <td>${y}</td>
                    <td>${r}</td>
                    <td>${result ? "Попадание" : "Промах"}</td>
                    <td>${date}</td>
                    `;

    document.getElementById("resultBody").appendChild(row);
}

function saveResult(x, y, r, result, isoDate) {
    const results = JSON.parse(localStorage.getItem("results")) || [];
    
    results.push({
        x: x,
        y: y,
        r: r,
        result: result,
        date: isoDate
    });

    localStorage.setItem("results", JSON.stringify(results));
}

function loadResults() {
    const results = JSON.parse(localStorage.getItem("results")) || [];

    results.forEach(element => {
        addResultTotable(element.x,
            element.y,
            element.r,
            element.result,
            new Date(element.date).toLocaleString("ru-RU")
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