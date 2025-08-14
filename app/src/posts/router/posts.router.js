import express from 'express'
import commentsRouter from '../comments/router/comments.router.js'


const router = express.Router({ mergeParams: true })
router.use('/:postId/comments', commentsRouter);
router.get('/', (req, res) => {
    res.send("hello!");
});
router.delete('/:postId', (req, res) => {
    res.send("hello!");
});
router.put('/:postId', (req, res) => {
    res.send("hello!");
});
router.post('/', (req, res) => {
    res.send("hello!");
});
router.get('/:postId', (req, res) => {
    res.send("hello!");
});
export default router;