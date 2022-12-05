# Semantic empowered

⚠️ Experimental ⚠️

## Usage

It is intended to run the API locally in order to have access to the vault content at all time.
Eventually some cloud deployment could be imagined.

### Sentence transformers

```bash
make semantic/install
```

You might need `nltk` data:

```py
import nltk
nltk.download('all')
```

```bash
uvicorn semantic.api:app --port 3333
```

#### Fine-tuning

For better results, you should fine-tune the model on your vault.

```bash
python3 semantic/fine_tuning.py fine_tune --use_wandb False
```

Using [Weights & Biases](https://wandb.ai/site):

```bash
wandb login
python3 semantic/fine_tuning.py fine_tune --use_wandb True
```

Saving to Huggingface Hub

```bash
python3 semantic/fine_tuning.py fine_tune --use_wandb False --save True
```
