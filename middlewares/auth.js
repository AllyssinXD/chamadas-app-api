import jwt from 'jsonwebtoken'

import adminModel from '../models/adminModel.js';

export default async (req, res, next)=>{
    const token = req.headers.authorization?req.headers.authorization.replace("Bearer ", ""):null;

    if(!token) {
        res.status(500).json({ success:false, message: 'Rota Protegida : Token necessário.' });
        return
    }

    try{
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        
        const user = await adminModel.findOne({_id: decoded.userId})
        if(!user){
            res.status(500).json({ success:false, message: 'Usuário com token não existe mais.' });
            return
        }
        
        delete user.password;

        req.user = user
        next()
    } catch (err){
        res.status(401).json({ message: 'Token inválido ou expirado!' });
        return
    }
}