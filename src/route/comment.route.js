import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { pool } from '../db.config.js';

const router = Router();

/**
 * [GET] /api/posts/:postId/comments
 * 응답: [{ id, author, body, createdAt }]
 */
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId) || postId <= 0) {
      return res.status(400).json({ ok: false, message: 'postId invalid' });
    }

    const [rows] = await pool.query(
     `SELECT
        c.\`comment_id\` AS id,   -- ✅ PK alias
        c.\`content\`,
        c.\`created_at\`,
        u.\`user_id\`    AS authorId,
        u.\`nickname\`   AS author
      FROM \`comment\` c
      JOIN \`users\` u ON u.\`user_id\` = c.\`user_id\`   -- ✅ user_id로 조인
      WHERE c.\`post_id\` = ?
      ORDER BY c.\`comment_id\` DESC`,
     [postId]
   );

    const items = rows.map(r => ({
      id: r.id,
      authorId: r.authorId, 
      author: r.author || String(r.authorId),
      body: r.content,
      createdAt: r.created_at,
    }));

    return res.json(items);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * [POST] /api/posts/:postId/comments
 * body: { body: string } // 또는 { text: string } 허용
 * 로그인 필요
 * 응답: { ok:true, id }
 */
router.post('/posts/:postId/comments', requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const text = (req.body?.body ?? req.body?.text ?? '').toString().trim();

    if (!Number.isFinite(postId) || postId <= 0) {
      return res.status(400).json({ ok: false, message: 'postId invalid' });
    }
    if (!text) {
      return res.status(400).json({ ok: false, message: 'content required' });
    }

    const user = req.session.user; // { id, email }

    const [r] = await pool.query(
     'INSERT INTO `comment` (`post_id`, `user_id`, `content`, `created_at`) VALUES (?, ?, ?, NOW())',
     [postId, user.id, text]
   );

    return res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(postId) || !Number.isFinite(commentId)) {
      return res.status(400).json({ ok: false, message: "id invalid" });
    }

    // (처음엔 소유권 체크 없이 삭제만 테스트해보자)
    const [r] = await pool.query(
      "DELETE FROM `comment` WHERE `post_id` = ? AND `comment_id` = ?",
      [postId, commentId]
    );

    if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: "not found" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[comments DELETE]", e.code, e.sqlMessage, e.sql);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});
export default router;