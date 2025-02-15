use std::sync::{atomic::AtomicBool, Arc};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Piece {
    kind: String,
    color: String,
}

#[wasm_bindgen]
impl Piece {
    #[wasm_bindgen]
    pub fn kind(&self) -> String {
        self.kind.clone()
    }

    #[wasm_bindgen]
    pub fn color(&self) -> String {
        self.color.clone()
    }
}


#[wasm_bindgen]
pub struct Game(chess::game::Game);

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self(chess::game::Game::new("4k3/P3N3/8/8/8/8/8/R3K2R w KQ - 0 1").unwrap())
        // Self(chess::game::Game::default())
    }



    #[wasm_bindgen]
    pub fn color_to_move(&self) -> String {
        match self.0.color_to_move() {
            chess::game::color::Color::White => String::from("white"),
            chess::game::color::Color::Black => String::from("black"),
        }
    }
    
    #[wasm_bindgen]
    pub fn get_piece(&self, square: &str) -> Option<Piece> {
        let s = chess::game::square::Square::new(
            square.chars().nth(1)?.try_into().ok()?,
            square.chars().nth(0)?.try_into().ok()?,
        );

        if let Some(piece) = self.0.get_piece(s) {
            let kind = match piece.kind() {
                chess::game::piece::PieceKind::Pawn => String::from("pawn"),
                chess::game::piece::PieceKind::Knight => String::from("knight"),
                chess::game::piece::PieceKind::Bishop => String::from("bishop"),
                chess::game::piece::PieceKind::Rook => String::from("rook"),
                chess::game::piece::PieceKind::Queen => String::from("queen"),
                chess::game::piece::PieceKind::King => String::from("king")
            };

            let color = match piece.color() {
                chess::game::color::Color::White => String::from("white"),
                chess::game::color::Color::Black => String::from("black"),
            };

            Some(Piece {kind, color})
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn fen(&self) -> String {
        self.0.fen()
    }

    #[wasm_bindgen]
    pub fn to_string(&self) -> String {
        self.0.to_string()
    }

    #[wasm_bindgen]
    pub fn move_history(&self) -> Vec<String> {
        self.0.move_history().iter().map(|mv| mv.to_string()).collect()
    }

    #[wasm_bindgen]
    pub fn legal_moves(&mut self) -> Vec<String> {
        self.0.moves().into_iter().map(|mv| mv.to_string()).collect()
    }

    #[wasm_bindgen]
    pub fn make_move(&mut self, m: &str) {
        if let Some(mv) = chess::uci::parse_move(&mut self.0, m) {
            self.0.push(mv);
        }
    }

    #[wasm_bindgen]
    pub fn is_check(&self) -> bool {
        self.0.is_check()
    }
}



#[wasm_bindgen]
pub struct Engine(chess::game::Game);

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self(chess::game::Game::default())
    }

    #[wasm_bindgen]
    pub fn to_string(&self) -> String {
        self.0.to_string()
    }

    #[wasm_bindgen]
    pub fn execute(&mut self, command: &str) -> Option<String> {
        

        // A really limited set of UCI commands supported at the moment.
        if command.starts_with("position ") {
            if let Some(game) = chess::uci::parse_position(command) {
                self.0 = game;
            }
        } else if command.starts_with("go ") {
            
            if let Some(params) = chess::uci::parse_go(command) {
                let (bestmove, _) = chess::search::search(self.0.clone(), params, Arc::new(AtomicBool::new(false)));
                return Some(bestmove.to_string());
            }
        }


        return None;
    }
}





