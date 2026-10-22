import com.fastcgi.FCGIInterface;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class Server {

    private static final List<BigDecimal> ALLOWED_X = Arrays.asList(new BigDecimal("-5"),
            new BigDecimal("-4"), new BigDecimal("-3"), new BigDecimal("-2"), new BigDecimal("-1"),
            new BigDecimal("0"), new BigDecimal("1"), new BigDecimal("2"), new BigDecimal("3"));

    private static final List<BigDecimal> ALLOWED_R = Arrays.asList(new BigDecimal("1"),
            new BigDecimal("1.5"), new BigDecimal("2"), new BigDecimal("2.5"), new BigDecimal("3"));

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");


    public static void main(String[] args) {
        FCGIInterface fcgiInterface = new FCGIInterface();

        while (fcgiInterface.FCGIaccept() >= 0) {
            long startTime = System.nanoTime();

            try {
                String method = System.getProperty("REQUEST_METHOD", "");

                if (!"POST".equalsIgnoreCase(method)) {
                    sendJson(405, "{\"ошибка\": \"Метод не поддерживается. Разрешён только POST\"}");
                    continue;
                }

                String requestBody = readRequestBody();
                if (requestBody.isEmpty()) {
                    sendJson(400, "{\"ошибка\": \"тело запроса пустое\"}");
                    continue;
                }
                String xStr = parseValue(requestBody, "x");
                String yStr = parseValue(requestBody, "y");
                String rStr = parseValue(requestBody, "r");

                String validationError = validate(xStr, yStr, rStr);
                if (validationError != null) {
                    sendJson(400, String.format("{ \"error\": \"%s\" }", escapeJson(validationError)));
                    continue;
                }

                BigDecimal x = new BigDecimal(xStr.replace(",", "."));
                BigDecimal y = new BigDecimal(yStr.replace(",", "."));
                BigDecimal r = new BigDecimal(rStr.replace(",", "."));

                boolean hit = checkPoint(x, y, r);

                long durationNano = System.nanoTime() - startTime;
                double durationMs = durationNano / 1_000_000.0;
                String currentTime = LocalDateTime.now().format(FORMATTER);

                String jsonResponse = String.format(
                        java.util.Locale.US,
                        "{\"x\": \"%s\", \"y\": \"%s\", \"r\": \"%s\", \"result\": %b, \"currentTime\": \"%s\", \"executionTime\": \"%.4f\"}",
                        x.toPlainString(), y.toPlainString(), r.toPlainString(), hit, currentTime, durationMs
                );

                sendJson(200, jsonResponse);
            } catch (Exception e) {
                sendJson(500, String.format("{\"error\": \"Server error: %s\"}", escapeJson(e.getMessage())));
            }
        }
    }
    private static String parseValue(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + field + "\"\\s*:\\s*\"(-?[0-9]+(?:\\.[0-9]+)?)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static String readRequestBody() throws IOException {
        String lenStr = System.getProperty("CONTENT_LENGTH");
        if (lenStr == null || lenStr.isEmpty()) return "";

        int length = Integer.parseInt(lenStr);
        byte[] bytes = new byte[length];
        int totalRead = 0;

        while (totalRead < length) {
            int read = System.in.read(bytes, totalRead, length - totalRead);
            if (read == -1) break;
            totalRead += read;
        }

        return new String(bytes, 0, totalRead, StandardCharsets.UTF_8);
    }

    private static String validate(String strX, String strY, String strR) {
        if (strX == null || strX.trim().isEmpty()) return "Параметр X не задан";
        if (strY == null || strY.trim().isEmpty()) return "Параметр Y не задан";
        if (strR == null || strR.trim().isEmpty()) return "Параметр R не задан";

        BigDecimal x, y, r;

        try {
            x = new BigDecimal(strX.trim().replace(",", "."));
            boolean xValid = ALLOWED_X.stream().anyMatch(val -> val.compareTo(x) == 0);
            if (!xValid) {
                return "X должен входить в набор допустимых значений";
            }
        } catch (NumberFormatException e) {
            return "Некорректное значение X";
        }

        try {
            y = new BigDecimal(strY.trim().replace(",", "."));
            if (y.compareTo(new BigDecimal("-5")) <= 0 || y.compareTo(new BigDecimal("5")) >= 0) {
                return "Y должен лежать в интервале от -5 до 5";
            }
        } catch (NumberFormatException e) {
            return "Некорректное значение Y";
        }
        try {
            r = new BigDecimal(strR.trim().replace(",", "."));
            boolean validR = ALLOWED_R.stream().anyMatch(val -> val.compareTo(r) == 0);
            if (!validR) {
                return "R должен входить в набор допустимых значений";
            }
        } catch (NumberFormatException e) {
            return "Некорректное значение R";
        }

        return null;
    }

    public static boolean checkPoint(BigDecimal x, BigDecimal y, BigDecimal r) {
        BigDecimal zero = BigDecimal.ZERO;

        BigDecimal halfR = r.divide(new BigDecimal("2"), 10, java.math.RoundingMode.HALF_UP);
        BigDecimal negHalfR = halfR.negate();

        boolean inCircle = x.compareTo(zero) >= 0 && y.compareTo(zero) >= 0
                && (x.multiply(x).add(y.multiply(y)).compareTo(halfR.multiply(halfR)) <= 0);

        boolean inRectangle = x.compareTo(negHalfR) >= 0 && x.compareTo(zero) <= 0
                && y.compareTo(zero) >= 0 && y.compareTo(r) <= 0;

        boolean inTriangle = x.compareTo(zero) <= 0 && y.compareTo(zero) <= 0
                && x.add(y).add(r).compareTo(zero) >= 0;

        return inCircle || inRectangle || inTriangle;
    }

    private static void sendJson(int statusCode, String json) {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        String header = "Status: " + statusCode + "\r\n"
                + "Content-type: application/json; charset=utf-8\r\n"
                + "Content-length: " + bytes.length + "\r\n\r\n";

        try {
            System.out.print(header);
            System.out.write(bytes);
            System.out.flush();
        } catch (IOException e) {
            System.err.println("Соединение разорвано" + e.getMessage());
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}