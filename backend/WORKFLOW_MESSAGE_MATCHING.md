# Workflow Message Matching Logic

## Vấn đề đã được giải quyết

**Vấn đề cũ**: Khi user gửi cùng một tin nhắn nhiều lần, lần đầu match được nhưng các lần sau báo "unmatched".

**Nguyên nhân**: Logic cũ chỉ tìm match trong node hiện tại. Sau khi chuyển node, node mới có thể không có button/quick reply tương ứng.

## Logic mới

### 1. **Tìm match trong node hiện tại trước**
```typescript
// Tìm trong buttons, quick replies, elements của node hiện tại
if (currentNode?.data.buttons) {
  const matchedButton = currentNode.data.buttons.find(
    (button) => button.payload === userInput
  );
  // Nếu tìm thấy -> return { nodeId: edge.target, matched: true }
}
```

### 2. **FALLBACK: Tìm match trong tất cả nodes**
```typescript
// Nếu không tìm thấy ở node hiện tại, tìm trong tất cả nodes khác
for (const node of nodes) {
  if (node.id === currentNodeId) continue; // Skip node hiện tại
  
  // Check buttons, quick replies, elements của từng node
  if (node.data.buttons) {
    const matchedButton = node.data.buttons.find(
      (button) => button.payload === userInput
    );
    if (matchedButton) {
      return { nodeId: node.id, matched: true }; // Chuyển đến node có match
    }
  }
}
```

### 3. **Response API với inWorkFlowMsg flag**

#### Khi **match được** (inWorkFlowMsg: true):
```json
{
  "messageType": "text",
  "text": "Phản hồi từ workflow node",
  "sessionId": "session_id",
  "workflowEnded": false,
  "inWorkFlowMsg": true,
  "originalMessage": "Nội dung tin nhắn từ node",
  "metadata": {
    "nodeId": "node_123",
    "nodeType": "text"
  }
}
```

#### Khi **không match** (inWorkFlowMsg: false):
```json
{
  "messageType": "text", 
  "text": "Tin nhắn gốc từ user",
  "sessionId": "session_id",
  "workflowEnded": false,
  "inWorkFlowMsg": false,
  "originalMessage": "Tin nhắn gốc từ user",
  "metadata": {
    "nodeId": "current_node",
    "nodeType": "unmatched"
  }
}
```

## Ví dụ hoạt động

### Workflow setup:
- **Node A**: "Chào mừng" với buttons ["Hỗ trợ", "Sản phẩm"]
- **Node B**: "Menu hỗ trợ" với buttons ["FAQ", "Liên hệ"]  
- **Node C**: "Menu sản phẩm" với buttons ["Laptop", "Điện thoại"]

### Trường hợp test:

1. **User gửi: "Hỗ trợ"**
   - ✅ Match button ở Node A → Chuyển đến Node B
   - inWorkFlowMsg: true

2. **User gửi lại: "Hỗ trợ"** (từ Node B)
   - ❌ Node B không có button "Hỗ trợ"
   - ✅ **FALLBACK**: Tìm thấy ở Node A → Chuyển về Node A
   - inWorkFlowMsg: true

3. **User gửi: "Xin chào random"**
   - ❌ Không tìm thấy ở node nào
   - inWorkFlowMsg: false
   - text: "Xin chào random" (để gọi hệ thống bên ngoài)

## Lợi ích

✅ **Tương thích ngược**: User có thể gửi lại command từ bất kỳ đâu
✅ **Flexible navigation**: Không bị "mắc kẹt" ở một node  
✅ **Clear indication**: Flag `inWorkFlowMsg` cho phép xử lý external AI
✅ **Better UX**: User không cần nhớ đang ở node nào

## State Machine Flow

```
waiting → processing → {
  matched + has message → responding → waiting
  matched + no message → waiting  
  unmatched → unmatched → waiting
  no edges → ended
}
``` 