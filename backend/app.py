from flask import Flask, request, jsonify, send_from_directory
import whisper
import os
from flask_cors import CORS
from deep_translator import GoogleTranslator
import requests
import json

# Khởi tạo ứng dụng Flask
app = Flask(__name__)
# Kích hoạt Cross-Origin Resource Sharing (CORS) cho ứng dụng Flask của bạn
CORS(app)

# Định nghĩa thư mục nơi các tệp đã tải lên sẽ được lưu trữ.
# os.path.abspath(".") lấy đường dẫn tuyệt đối của thư mục hiện tại.
UPLOAD_FOLDER = os.path.abspath(".")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Tải mô hình ASR Whisper một lần khi ứng dụng khởi động.
# "base" là một mô hình nhỏ hơn phù hợp cho việc sao chép chung.
# Đây là một hoạt động tốn nhiều tài nguyên, vì vậy nó được thực hiện một lần.
model = whisper.load_model("base")

@app.route("/upload", methods=["POST"])
def upload_audio():
    """
    Xử lý việc tải lên tệp âm thanh, phiên âm chúng, dịch bản phiên âm,
    và xác định các thành ngữ/cụm từ cố định bằng cách sử dụng API Gemini.
    """
    # Kiểm tra xem một tệp có được bao gồm trong yêu cầu hay không
    if "file" not in request.files:
        return jsonify({"error": "Không có tệp nào được tải lên."}), 400

    file = request.files["file"]
    # Định nghĩa tên tệp cho âm thanh đã tải lên.
    # Lưu ý: Sử dụng tên tệp cố định "uploaded.mp3" có nghĩa là các lần tải lên tiếp theo
    # sẽ ghi đè lên các tệp trước đó. Đối với môi trường sản xuất,
    # hãy cân nhắc tạo tên tệp duy nhất (ví dụ: sử dụng UUID).
    filename = "uploaded.mp3"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath) # Lưu tệp đã tải lên vào đường dẫn đã chỉ định

    try:
        # Phiên âm tệp âm thanh bằng mô hình Whisper đã tải.
        # Thao tác này chuyển lời nói thành văn bản.
        result = model.transcribe(filepath)
        segments = [] # Khởi tạo một danh sách để giữ các phân đoạn đã xử lý

        # Lặp lại qua từng phân đoạn được xác định bởi Whisper
        for seg in result["segments"]:
            # Trích xuất văn bản từ phân đoạn và loại bỏ khoảng trắng đầu/cuối
            text = seg["text"].strip()
            
            # Dịch văn bản tiếng Anh đã phiên âm sang tiếng Việt bằng GoogleTranslator.
            # 'source="auto"' tự động phát hiện ngôn ngữ nguồn.
            translation = GoogleTranslator(source="auto", target="vi").translate(text)
            
            idioms_found = [] # Khởi tạo một danh sách trống cho các thành ngữ được tìm thấy trong phân đoạn này

            # Gọi API Gemini để tìm thành ngữ/cụm từ cố định
            try:
                # Chuẩn bị lời nhắc cho API Gemini để xác định các thành ngữ/cụm từ cố định.
                # Lời nhắc yêu cầu định dạng JSON cụ thể để dễ dàng phân tích.
                gemini_prompt = f"""
                Phân tích văn bản tiếng Anh sau và xác định bất kỳ thành ngữ hoặc cụm từ cố định nào. Đối với mỗi thành ngữ/cụm từ cố định tìm thấy, cung cấp cụm từ gốc và ý nghĩa/dịch của nó bằng tiếng Việt. Nếu không tìm thấy thành ngữ hoặc cụm từ cố định nào, hãy phản hồi bằng một mảng JSON rỗng `[]`.
                Văn bản: '{text}'
                Phản hồi chỉ ở định dạng JSON, như sau:
                ```json
                [
                  {{
                    "phrase": "thành ngữ hoặc cụm từ cố định 1",
                    "vietnamese_meaning": "ý nghĩa tiếng việt 1"
                  }},
                  {{
                    "phrase": "thành ngữ hoặc cụm từ cố định 2",
                    "vietnamese_meaning": "ý nghĩa tiếng việt 2"
                  }}
                ]
                ```
                """
                
                # Khóa API Gemini cho môi trường Canvas nên là một chuỗi trống.
                # Thời gian chạy Canvas sẽ tự động thêm khóa API thực tế.
                gemini_api_key = "AIzaSyA1RunHla3V5GSnBGCNrYwYquZauix0ZDo" 
                gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"

                # Xây dựng tải trọng cho yêu cầu API Gemini.
                # Nó bao gồm lời nhắc của người dùng và cấu hình tạo
                # để đảm bảo phản hồi ở định dạng JSON theo một lược đồ.
                gemini_payload = {
                    "contents": [{"role": "user", "parts": [{"text": gemini_prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "responseSchema": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "phrase": {"type": "STRING"},
                                    "vietnamese_meaning": {"type": "STRING"}
                                },
                                "propertyOrdering": ["phrase", "vietnamese_meaning"]
                            }
                        }
                    }
                }

                # Thực hiện yêu cầu POST đến API Gemini.
                gemini_response = requests.post(gemini_api_url, json=gemini_payload)
                # Ném một HTTPError cho các phản hồi xấu (mã trạng thái 4xx hoặc 5xx).
                gemini_response.raise_for_status() 
                
                # Phân tích phản hồi JSON từ API Gemini.
                gemini_result = gemini_response.json()

                # Trích xuất nội dung liên quan (chuỗi JSON với các thành ngữ) từ phản hồi Gemini.
                if gemini_result.get("candidates") and len(gemini_result["candidates"]) > 0 and \
                   gemini_result["candidates"][0].get("content") and \
                   gemini_result["candidates"][0]["content"].get("parts") and \
                   len(gemini_result["candidates"][0]["content"]["parts"]) > 0:
                    
                    # Nội dung được mong đợi là một chuỗi JSON, sau đó cần được phân tích.
                    json_str = gemini_result["candidates"][0]["content"]["parts"][0]["text"]
                    idioms_found = json.loads(json_str) # Phân tích chuỗi JSON thành một danh sách/dict Python
                    
            except requests.exceptions.RequestException as req_err:
                # Xử lý các lỗi liên quan đến yêu cầu HTTP đến API Gemini (ví dụ: sự cố mạng, URL không hợp lệ).
                print(f"Lỗi khi gọi API Gemini: {req_err}")
                # Trong một ứng dụng sản xuất, bạn có thể ghi nhật ký lỗi này hoặc thông báo cho người dùng.
            except json.JSONDecodeError as json_err:
                # Xử lý các lỗi nếu phản hồi API Gemini không phải là JSON hợp lệ.
                print(f"Lỗi giải mã phản hồi JSON của Gemini: {json_err}. Phản hồi thô: {gemini_response.text if 'gemini_response' in locals() else 'Không nhận được phản hồi'}")
                # Điều này có thể xảy ra nếu Gemini không tuân thủ chính xác lược đồ hoặc trả về thông báo lỗi dưới dạng văn bản.
            except Exception as e:
                # Bắt bất kỳ lỗi không mong muốn nào khác trong quá trình gọi API Gemini.
                print(f"Đã xảy ra lỗi không mong muốn trong quá trình gọi API Gemini: {e}")

            # Thêm dữ liệu phân đoạn đã xử lý vào danh sách.
            # Điều này bao gồm thời gian bắt đầu/kết thúc, bản ghi gốc, bản dịch tiếng Việt,
            # và bất kỳ thành ngữ nào được Gemini xác định.
            segments.append({
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "transcript": text,
                "translation": translation,
                "idioms_found": idioms_found # Thêm các thành ngữ/cụm từ cố định mới tìm thấy
            })

        # Trả về phản hồi JSON cuối cùng chứa tất cả các phân đoạn.
        return jsonify({"audio": filename, "segments": segments})

    except Exception as e:
        # Bắt bất kỳ lỗi nào xảy ra trong luồng phiên âm/xử lý chính.
        return jsonify({"error": str(e)}), 500

@app.route("/<path:filename>")
def serve_file(filename):
    """
    Phục vụ các tệp tĩnh từ UPLOAD_FOLDER.
    Điều này được sử dụng để phục vụ tệp âm thanh đã tải lên trở lại máy khách nếu cần.
    """
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == "__main__":
    # Chạy ứng dụng Flask.
    # debug=True cho phép tự động tải lại máy chủ khi có thay đổi mã
    # và cung cấp các thông báo lỗi chi tiết hơn, hữu ích cho việc phát triển.
    app.run(port=5000, debug=True)
