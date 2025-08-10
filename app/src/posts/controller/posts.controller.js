import pool from "../db.js";

// 모든 게시글 조회
export const getPosts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Post ORDER BY created_at DESC"
    );
    res.status(200).json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "게시글 목록 조회에 실패하였습니다." });
  }
};

// 특정 게시글 조회
export const getPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM Post WHERE post_id = ?", [
      postId,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }
    res.status(200).json({ data: rows[0] });
  } catch (err) {
    console.error("게시글 조회 오류:", err.message);
    res.status(500).json({ message: "게시글 조회에 실패하였습니다." });
  }
};

// 게시글 생성
export const createPost = async (req, res) => {
  try {
    const { title, content, user_id } = req.body;
    if (!title || !content || !user_id) {
      return res
        .status(400)
        .json({ message: "제목, 게시글, 사용자 ID는 필수입니다." });
    }
    await pool.query(
      "INSERT INTO POST (title, content, user_id, created_at) VALUES (?, ? ,?, NOW())",
      [title, content, user_id]
    );
    res.status(201).json({ message: "게시글이 작성되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "게시글 작성에 실패했습니다." });
  }
};

// 게시글 수정
export const updatePost = async (req, res) => {
  const { postId } = req.params;
  const { title, content } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE Post SET title = ?, content = ? WHERE post_id =?",
      [title, content, postId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "수정할 게시글을 찾을 수 없습니다. " });
    }
    res.status(200).json({ message: "게시글이 수정되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "게시글 수정에 실패하였습니다." });
  }
};

// 게시글 삭제
export const deletePost = async (req, res) => {
  const { postId } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM Post WHERE post_id = ?", [
      postId,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "삭제할 게시글을 찾을 수 없습니다." });
    }
    res.status(200).json({ message: "게시글이 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "게시글 삭제에 실패하였습니다." });
  }
};
