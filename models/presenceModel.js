import mongoose, { Schema } from "mongoose";

const presenceSchema = new Schema({
    id_chamada: {type: mongoose.Types.ObjectId, ref: 'chamada', required: true}, 
    nome: {type: String, required: true},
    envio: {type: Date, required: true},
    ip: {type: String},
    uuid: {type: String},
    long: {type: Number},
    lag: {type: Number}
})

export default mongoose.model('presence', presenceSchema);