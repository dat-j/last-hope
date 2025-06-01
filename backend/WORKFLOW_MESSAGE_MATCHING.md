# Workflow Message Matching Logic - Enhanced Version

## Các cải tiến mới

**Trước đây**: Chỉ match với `button.payload` và `quickReply.payload`  
**Bây giờ**: Match với **TẤT CẢ** loại content trong workflow nodes

## Logic matching mới - Toàn diện

### 1. **Exact Payload Matching** (Ưu tiên cao nhất)
```typescript
// So sánh chính xác payload
button.payload === userInput
quickReply.payload === userInput  
element.payload === userInput
element.quickReplyPayload === userInput
```

### 2. **Content-based Matching** (Case-insensitive)
```typescript
const input = userInput.toLowerCase().trim();

// Buttons & Quick Replies Title
button.title.toLowerCase().includes(input)
quickReply.title.toLowerCase().includes(input)

// Elements Content
switch (element.type) {
  case 'text':
    element.content.toLowerCase().includes(input)
    
  case 'image':
    element.title.toLowerCase().includes(input) ||
    element.imageUrl.toLowerCase().includes(input)
    
  case 'video':
    element.title.toLowerCase().includes(input) ||
    element.fileUrl.toLowerCase().includes(input)
    
  case 'file':
    element.title.toLowerCase().includes(input) ||
    element.fileUrl.toLowerCase().includes(input)
    
  case 'generic_card':
    element.title.toLowerCase().includes(input) ||
    element.subtitle.toLowerCase().includes(input) ||
    element.buttons[].title.toLowerCase().includes(input)
    
  case 'list_item':
    element.title.toLowerCase().includes(input) ||
    element.subtitle.toLowerCase().includes(input)
}
```

### 3. **Node-level Matching**
```typescript
// Node message content
node.data.message.toLowerCase().includes(input)

// Node label
node.data.label.toLowerCase().includes(input)
```

### 4. **Receipt Node Special Keywords**
```typescript
if (node.data.messageType === 'receipt') {
  const keywords = ['receipt', 'bill', 'order', 'payment', 'invoice', 
                   'hóa đơn', 'đơn hàng', 'thanh toán'];
  
  // Keyword matching
  keywords.some(keyword => input.includes(keyword))
  
  // Receipt fields
  node.data.recipientName.toLowerCase().includes(input)
  node.data.orderNumber.toLowerCase().includes(input)
}
```

## Ví dụ chi tiết

### **Trường hợp 1: Text Element**
```json
{
  "id": "node_greeting",
  "data": {
    "message": "Xin chào!",
    "elements": [
      {
        "type": "text",
        "content": "Chào mừng bạn đến với cửa hàng"
      }
    ]
  }
}

// User gửi: "chào" hoặc "cửa hàng" hoặc "welcome"
// ✅ Match: element.content.includes("chào") || element.content.includes("cửa hàng")
```

### **Trường hợp 2: Image Element**
```json
{
  "id": "node_product",
  "data": {
    "elements": [
      {
        "type": "image",
        "title": "iPhone 15 Pro Max",
        "imageUrl": "https://example.com/iphone15.jpg"
      }
    ]
  }
}

// User gửi: "iphone" hoặc "15" hoặc "pro"
// ✅ Match: element.title.includes("iphone") || element.title.includes("15")
// User gửi: "jpg" hoặc "iphone15"  
// ✅ Match: element.imageUrl.includes("jpg") || element.imageUrl.includes("iphone15")
```

### **Trường hợp 3: Receipt Node**
```json
{
  "id": "node_receipt",
  "data": {
    "messageType": "receipt",
    "recipientName": "Nguyễn Văn A",
    "orderNumber": "ORD-12345"
  }
}

// User gửi: "hóa đơn" hoặc "receipt" hoặc "bill"
// ✅ Match: Special keywords
// User gửi: "Nguyễn" hoặc "ORD-12345"
// ✅ Match: recipientName/orderNumber contains input
```

### **Trường hợp 4: Generic Card**
```json
{
  "id": "node_menu",
  "data": {
    "elements": [
      {
        "type": "generic_card",
        "title": "Laptop Gaming",
        "subtitle": "Máy tính chơi game cao cấp",
        "buttons": [
          {"title": "Xem chi tiết", "payload": "view_laptop"},
          {"title": "Mua ngay", "payload": "buy_laptop"}
        ]
      }
    ]
  }
}

// User gửi: "laptop" → Match title
// User gửi: "gaming" → Match title  
// User gửi: "máy tính" → Match subtitle
// User gửi: "chi tiết" → Match button title
// User gửi: "view_laptop" → Exact payload match
```

## Thứ tự ưu tiên matching

1. **Current Node - Exact Payload**: `button.payload === userInput`
2. **Current Node - Content Match**: Title, content, message contains input
3. **All Nodes - Exact Payload**: Search toàn bộ workflow  
4. **All Nodes - Content Match**: Search content trong tất cả nodes

## Response với các loại content

### **Text/Image/Video/File Match:**
```json
{
  "messageType": "text", // or "attachment" for media
  "text": "Nội dung message từ node",
  "inWorkFlowMsg": true,
  "originalMessage": "Nội dung từ node",
  "metadata": {
    "nodeId": "matched_node_id",
    "nodeType": "text|image|video|file",
    "matchedElement": {
      "type": "text|image|video|file",
      "content": "Nội dung được match"
    }
  }
}
```

### **Receipt Match:**
```json
{
  "messageType": "attachment",
  "attachment": {
    "type": "template",
    "payload": {
      "template_type": "receipt",
      "recipient_name": "Nguyễn Văn A",
      "order_number": "ORD-12345",
      // ... receipt data
    }
  },
  "inWorkFlowMsg": true,
  "metadata": {
    "nodeType": "receipt"
  }
}
```

## Lợi ích của hệ thống mới

✅ **Linh hoạt**: Match với mọi loại content  
✅ **Thông minh**: Case-insensitive, keyword-based  
✅ **Toàn diện**: Hỗ trợ text, media, receipt, cards...  
✅ **Intuitive**: User có thể nhắn keyword tự nhiên  
✅ **Multilingual**: Hỗ trợ cả tiếng Việt và tiếng Anh  

## Ví dụ thực tế

**User gửi "hihi"**:
- Nếu có button với title "Hi Hi" → ✅ Match
- Nếu có text element chứa "hihi" → ✅ Match  
- Nếu có node message chứa "hihi" → ✅ Match
- Nếu không có gì → ❌ inWorkFlowMsg: false

## State Machine Flow

```
waiting → processing → {
  matched + has message → responding → waiting
  matched + no message → waiting  
  unmatched → unmatched → waiting
  no edges → ended
}
``` 