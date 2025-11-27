import mongoose, { Schema } from "mongoose";

const chamadaInputValueSchema = new Schema({
    id_input: {type: mongoose.Types.ObjectId, ref: 'chamadaCustomInput', required: true},
    value: {type: String, required: true},
    presence_id: {type: mongoose.Types.ObjectId, ref: 'presence', required: true},
})

export default mongoose.model('chamadaInputValue', chamadaInputValueSchema);